// src/controllers/Game.controller.ts
import { Request, Response, NextFunction } from 'express';
import { gameService } from '../services/Game.service';
import {
  CreateGameRequest,
  JoinGameRequest,
  SubmitAnswerRequest,
} from '../types';
import { logger } from '../utils/logger';

export class GameController {
  /**
   * POST /games
   * Creates a new game
   */
  async createGame(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const settings: CreateGameRequest = req.body;

      const game = await gameService.createGame({
        ...settings,
        genres: settings.genres || [],
        years: settings.years || [],
      });

      res.status(201).json({
        success: true,
        data: {
          gameId: game.gameId,
          game,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /games/:gameId
   * Gets game state
   */
  async getGame(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { gameId } = req.params;
      const game = await gameService.getGame(gameId);

      res.json({
        success: true,
        data: game,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /games/:gameId/results
   * Gets game results
   */
  async getFinalResults(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { gameId } = req.params;
      const finalResults = await gameService.getFinalResults(gameId);

      res.json({
        success: true,
        data: finalResults,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /games/:gameId/join
   * Joins a game
   */
  async joinGame(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { gameId } = req.params;
      const { playerName }: JoinGameRequest = req.body;

      const result = await gameService.joinGame(gameId, playerName);

      res.json({
        success: true,
        data: {
          playerId: result.player.id,
          game: result.game,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /games/:gameId/start
   * Starts a game
   */
  async startGame(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { gameId } = req.params;
      await gameService.startGame(gameId);

      res.json({
        success: true,
        message: 'Game started',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const gameController = new GameController();
