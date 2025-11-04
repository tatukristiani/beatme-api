# 🎵 BeatMe API - Backend

Node.js + TypeScript + Express + MongoDB + WebSocket backend for the BeatMe multiplayer song guessing game. Built as a fun project for my younger brother who wanted to challenge his friends' music knowledge!

## 🎯 What It Does

This is the backend service that powers the BeatMe game, handling:

- **Game Session Management**: Create, join, and manage multiplayer game rooms
- **Real-Time Communication**: WebSocket server for instant game state updates
- **Song Library Integration**: Fetches music metadata from Deezer API
- **Player Management**: Handles multiple concurrent players and game sessions

## 🛠️ Tech Stack

### Core Technologies
- **Node.js** with **TypeScript** for type-safe server-side development
- **Express.js** for RESTful API endpoints
- **MongoDB** with **Mongoose** for data persistence
- **WebSocket (ws)** for real-time bidirectional communication
- **Deezer API** for fetching song metadata

## 📁 Project Structure

```
src/
├── controllers/           # Request handlers
│   ├── Game.controller.ts    # Game-related endpoints
│   └── Song.controller.ts    # Song-related endpoints
├── models/               # Database schemas
│   ├── Game.model.ts         # Game state & player data
│   └── Song.model.ts         # Song metadata
├── services/             # Business logic
│   ├── Game.service.ts       # Game orchestration
│   └── Deezer/              
│       └── Deezer.service.ts # External API integration
├── middleware/           # Express middleware
│   ├── errorHandler.ts       # Global error handling
│   └── validation.ts         # Request validation schemas
├── routes/               # API route definitions
│   └── index.ts             # Route configuration
├── types/                # TypeScript interfaces
│   └── index.ts             # Shared type definitions
├── utils/                # Utility functions
│   ├── errors.ts            # Custom error classes
│   └── logger.ts            # Logging utility
└── server.ts             # Application entry point
```

## 🚀 API Endpoints

### Game Management

#### Create Game
```http
POST /api/games
Content-Type: application/json

{
  "creatorName": "string",
  "timePerSong": 15 | 30 | 45 | 60,
  "songCount": 5 | 10 | 15 | 20,
  "genres": ["Pop", "Rock"], 
  "years": ["2020", "2010"] 
}

Response: {
  "success": true,
  "data": {
    "gameId": "uuid",
    "game": { GameState }
  }
}
```

#### Get Game State
```http
GET /api/games/:gameId

Response: {
  "success": true,
  "data": { GameState }
}
```

#### Join Game
```http
POST /api/games/:gameId/join
Content-Type: application/json

{
  "playerName": "string"
}

Response: {
  "success": true,
  "data": {
    "playerId": "uuid",
    "game": { GameState }
  }
}
```

#### Start Game
```http
POST /api/games/:gameId/start

Response: {
  "success": true,
  "message": "Game started"
}
```

#### Get Final Results
```http
GET /api/games/:gameId/results

Response: {
  "success": true,
  "data": {
    "gameId": "uuid",
    "finalScores": [ FinalPlayerScore ],
    "gameSettings": { GameSettings }
  }
}
```

### Song Management

#### Get Songs (with filters)
```http
GET /api/songs?genres=Pop,Rock&years=2020,2010&count=10

Response: {
  "success": true,
  "data": {
    "songs": [ Song ]
  }
}
```

#### Get Single Song
```http
GET /api/songs/:id

Response: {
  "success": true,
  "data": {
    "song": { Song }
  }
}

```

## 🔌 WebSocket Events

### Client → Server

#### Join Game Room
```javascript
{
  "event": "joinGame",
  "payload": {
    "gameId": "uuid",
    "playerId": "uuid"
  }
}
```

#### Start Game
```javascript
{
  "event": "startGame",
  "payload": {
    "gameId": "uuid"
  }
}
```

#### Submit Answer
```javascript
{
  "event": "submitAnswer",
  "payload": {
    "gameId": "uuid",
    "playerId": "uuid",
    "songId": "string",
    "guess": {
      "artist": "string",
      "songName": "string"
    },
    "timestamp": "ISO date"
  }
}
```

### Server → Client

#### Player Joined
```javascript
{
  "event": "playerJoined",
  "payload": {
    "game": { GameState }
  }
}
```

#### Game Started
```javascript
{
  "event": "startGame",
  "payload": {
    "success": true,
    "message": "Game started"
  }
}
```

#### Answer Submitted
```javascript
{
  "event": "answerSubmitted",
  "payload": {
    "game": { GameState }
  }
}
```

#### All Players Ready
```javascript
{
  "event": "allPlayersReady",
  "payload": {
    "result": {
      "roundNumber": number,
      "correctAnswer": {
        "artist": "string",
        "songName": "string"
      },
      "playerScores": [ PlayerRoundScore ]
    }
  }
}
```
