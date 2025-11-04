// src/controllers/Song.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Song } from '../models/Song.model';
import { logger } from '../utils/logger';
import { getDeezerTracksByGenre } from '../services/Deezer/Deezer.service';
import fetch from 'node-fetch';
import { Readable } from 'stream';

export class SongController {
  /**
   * GET /songs
   * Gets songs based on filters
   */
  async getSongs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { genres, years, count = '10' } = req.query;

      const genreArray = genres ? (genres as string).split(',') : undefined;
      const yearArray = years ? (years as string).split(',') : undefined;
      const songCount = parseInt(count as string, 10);

      const songs = await Song.getRandomSongs(songCount, genreArray, yearArray);

      res.json({
        success: true,
        data: { songs },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /songs
   * Creates a new song (admin only - implement auth as needed)
   */
  async createSong(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const songData = req.body;
      const song = new Song(songData);
      await song.save();

      res.status(201).json({
        success: true,
        data: { song },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /songs/bulk
   * Creates multiple songs (admin only)
   */
  async createBulkSongs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { songs } = req.body;
      const createdSongs = await Song.insertMany(songs);

      res.status(201).json({
        success: true,
        data: {
          count: createdSongs.length,
          songs: createdSongs,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /songs/:id
   * Gets a single song
   */
  async getSong(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const song = await Song.findOne({ songId: id });

      if (!song) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SONG_NOT_FOUND',
            message: 'Song not found',
            statusCode: 404,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { song },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /deezer/songs
   * Fetch songs from Deezer based on genre and year
   * Query params: genres and limit
   */
  async fetchSongsFromDeezer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { genres, limit, years } = req.query;
      if (!genres) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_GENRE',
            message: 'Genres query parameter is required',
            statusCode: 400,
          },
        });
        return;
      }

      const songLimit = parseInt(limit as string, 10);
      const individualGenres = (genres as string).split(',');
      const genreSongLimit = Math.ceil(songLimit / individualGenres.length);
      let songs: any[] = [];

      // Fetch songs for each genre and combine
      for (const genre of individualGenres) {
        const genreSongs = await getDeezerTracksByGenre(
          genre as string,
          genreSongLimit as unknown as number,
          years as string[],
        );
        songs = songs.concat(genreSongs);
      }

      res.json({
        success: true,
        data: { songs },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const songController = new SongController();
