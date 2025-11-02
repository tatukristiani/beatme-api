// src/routes/index.ts
import { Router } from 'express';
import { gameController } from '../controllers/Game.controller';
import { songController } from '../controllers/Song.controller';
import {
  validate,
  createGameSchema,
  joinGameSchema,
  submitAnswerSchema,
  createSongSchema,
} from '../middleware/validation';

const router = Router();

// Game routes
router.post(
  '/games',
  validate(createGameSchema),
  gameController.createGame.bind(gameController),
);
router.get('/games/:gameId', gameController.getGame.bind(gameController));
router.get(
  '/games/:gameId/results',
  gameController.getFinalResults.bind(gameController),
);
router.post(
  '/games/:gameId/join',
  validate(joinGameSchema),
  gameController.joinGame.bind(gameController),
);
router.post(
  '/games/:gameId/start',
  gameController.startGame.bind(gameController),
);

// Song routes
router.get('/songs', songController.getSongs.bind(songController));
router.get('/songs/:id', songController.getSong.bind(songController));
router.post(
  '/songs',
  validate(createSongSchema),
  songController.createSong.bind(songController),
);
router.post('/songs/bulk', songController.createBulkSongs.bind(songController));

router.get('/deezer/songs', songController.fetchSongsFromDeezer.bind(songController));

export default router;
