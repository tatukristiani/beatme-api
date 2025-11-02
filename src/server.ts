// src/server.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { GameService } from './services/Game.service';
import { SubmitAnswerRequest, GameState, RoundResult } from './types';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({
  server: httpServer,
  path: '/games',
});

// Define the structure of WebSocket messages
interface WSMessage<T = any> {
  event: string;
  payload: T;
}

// Define payloads for each known event
interface JoinGamePayload {
  gameId: string;
  playerId: string;
}

// Define all events
type ServerToClientEvent =
  | { event: 'playerJoined'; payload: { game: any } }
  | { event: 'startGame'; payload: { success: boolean; message: string } }
  | { event: 'answerSubmitted'; payload: { game: GameState } }
  | { event: 'allPlayersReady'; payload: { result: RoundResult } };

type ClientToServerEvent =
  | { event: 'joinGame'; payload: JoinGamePayload }
  | { event: 'startGame'; payload: { gameId: string } }
  | { event: 'submitAnswer'; payload: SubmitAnswerRequest };

// Store connections by game room
const gameRooms = new Map<string, Set<WebSocket>>();

const gameService = new GameService();

wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
  logger.info('New WebSocket connection established');
  ws.on('message', async (rawMessage: string) => {
    try {
      const message = JSON.parse(rawMessage) as ClientToServerEvent;

      switch (message.event) {
        case 'joinGame': {
          const { gameId, playerId } = message.payload;

          // Retrieve game
          const game = await gameService.getGame(gameId);

          logger.info(`Player ${playerId} joining game ${game}`);

          // Add player to DB (if not already added)
          if (!game.players.find((p) => p.id === playerId)) {
            await gameService.joinGame(gameId, playerId);
          }
          // Add socket to the game room
          if (!gameRooms.has(gameId)) {
            gameRooms.set(gameId, new Set());
          }
          gameRooms.get(gameId)!.add(ws);

          // Notify all players in the room
          broadcastToRoom(gameId, {
            event: 'playerJoined',
            payload: { game },
          });

          break;
        }
        case 'startGame': {
          const { gameId } = message.payload;

          // Retrieve game
          const game = await gameService.getGame(gameId);
          if (!game) {
            logger.warn(`Game ${gameId} not found for starting`);
            break;
          }
          logger.info(`Starting game ${gameId}`);

          // Notify all players in the room
          broadcastToRoom(gameId, {
            event: 'startGame',
            payload: { success: true, message: 'Game started' },
          });

          break;
        }
        case 'submitAnswer': {
          const gameId = message.payload.gameId;
          const submitRequest = message.payload;

          // Submit answer
          const game = await gameService.submitAnswer(submitRequest);
          if (!game) {
            logger.warn(`Game ${gameId} not found for answer submission`);
            break;
          }
          logger.info(`Answer submitted to game ${gameId}`);

          // Notify all players in the room about the submitted answer
          broadcastToRoom(gameId, {
            event: 'answerSubmitted',
            payload: { game },
          });

          // Check if all players are ready
          const allPlayersReady = await gameService.allPlayersReady(gameId);
          if (allPlayersReady) {
            logger.info(`All players ready in game ${gameId}`);
            broadcastToRoom(gameId, {
              event: 'allPlayersReady',
              payload: {
                result: await gameService.processRoundResults(gameId),
              },
            });
          }

          break;
        }
        default:
          logger.warn(
            `Unknown WebSocket event: ${(message as WSMessage).event}`,
          );
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', error);
    }
  });

  ws.on('close', () => {
    for (const [gameId, sockets] of gameRooms.entries()) {
      sockets.delete(ws);
    }
  });
});

// Helper function to broadcast messages
function broadcastToRoom(gameId: string, message: ServerToClientEvent) {
  const sockets = gameRooms.get(gameId);
  if (!sockets) return;

  const data = JSON.stringify(message);
  for (const client of sockets) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      statusCode: 404,
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/beatme';

    await mongoose.connect(mongoUri);

    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
      logger.info(`WebSocket available at ws://localhost:${PORT}/games`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  await mongoose.connection.close();
  logger.info('MongoDB connection closed');

  process.exit(0);
});

// Start the server
startServer();

export default app;
