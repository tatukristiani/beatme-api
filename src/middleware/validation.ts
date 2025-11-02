// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../utils/errors';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new AppError('VALIDATION_ERROR', 'Validation failed', 400, details);
    }

    next();
  };
};

// Validation schemas
export const createGameSchema = Joi.object({
  creatorName: Joi.string().min(1).max(50).required(),
  timePerSong: Joi.number().valid(15, 30, 45, 60).required(),
  songCount: Joi.number().valid(5, 10, 15, 20).required(),
  genres: Joi.array().items(Joi.string()).optional(),
  years: Joi.array().items(Joi.string()).optional(),
});

export const joinGameSchema = Joi.object({
  playerName: Joi.string().min(1).max(50).required(),
});

export const submitAnswerSchema = Joi.object({
  playerId: Joi.string().uuid().required(),
  songId: Joi.string().required(),
  guess: Joi.object({
    artist: Joi.string().allow(''),
    songName: Joi.string().allow(''),
  }).required(),
  timestamp: Joi.date().iso().required(),
});

export const createSongSchema = Joi.object({
  songId: Joi.string().required(),
  artist: Joi.string().required(),
  title: Joi.string().required(),
  audioUrl: Joi.string().uri().required(),
  duration: Joi.number().min(10).max(120).required(),
  genre: Joi.string().required(),
  year: Joi.string().required(),
  albumCover: Joi.string().uri().optional(),
});
