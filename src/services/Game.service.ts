import { v4 as uuidv4 } from 'uuid';
import { Game, IGame } from '../models/Game.model';
import { Song } from '../models/Song.model';
import {
  GameSettings,
  Player,
  GameState,
  RoundResult,
  FinalResults,
  PlayerRoundScore,
  FinalPlayerScore,
  WSEvent,
  SubmitAnswerRequest,
  Answer,
} from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { getDeezerTracksByGenre } from './Deezer/Deezer.service';

export class GameService {
  /**
   * Creates a new game
   */
  async createGame(settings: GameSettings): Promise<GameState> {
    const gameId = uuidv4();
    const playerId = uuidv4();

    // Fetch songs from Deezer
    const songLimit = parseInt(settings.songCount as unknown as string, 10);
    const individualGenres = settings.genres;
    const years = settings.years;
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

    if (songs.length < settings.songCount) {
      throw new AppError(
        'INSUFFICIENT_SONGS',
        `Only ${songs.length} songs available for the selected criteria`,
        400,
      );
    }

    await Song.addSongs(songs); // Add fetched songs to DB

    const creator: Player = {
      id: playerId,
      name: settings.creatorName,
      score: 0,
      isReady: false,
      answers: [],
    };

    const game = new Game({
      gameId,
      settings,
      players: [creator],
      creator: settings.creatorName,
      status: 'lobby',
      currentSong: 0,
      songs: songs.map((s) => s.songId || s.id), // Handle both songId and virtual id
    });

    await game.save();
    logger.info(`Game created: ${gameId}`);

    return this.toGameState(game);
  }

  /**
   * Gets game by ID
   */
  async getGame(gameId: string): Promise<GameState> {
    const game = await Game.findOne({ gameId });
    if (!game) {
      throw new AppError('GAME_NOT_FOUND', 'Game not found', 404);
    }
    return this.toGameState(game);
  }

  /**
   * Starts the game
   */
  async startGame(gameId: string): Promise<GameState> {
    const game = await Game.findOne({ gameId });
    if (!game) {
      throw new AppError('GAME_NOT_FOUND', 'Game not found', 404);
    }

    game.status = 'playing';
    game.startedAt = new Date();
    await game.save();
    logger.info(`Game started: ${gameId}`);
    return this.toGameState(game);
  }

  /**
   * Joins a game
   */
  async joinGame(
    gameId: string,
    playerName: string,
  ): Promise<{ player: Player; game: GameState }> {
    const game = await Game.findOne({ gameId });

    if (!game) {
      throw new AppError('GAME_NOT_FOUND', 'Game not found', 404);
    }

    if (game.status !== 'lobby') {
      throw new AppError(
        'GAME_ALREADY_STARTED',
        'Game has already started',
        400,
      );
    }

    // Check if name is taken
    const nameTaken = game.players.some((p: Player) => p.name === playerName);
    if (nameTaken) {
      throw new AppError('NAME_TAKEN', 'Name already taken', 409);
    }

    const playerId = uuidv4();
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isReady: false,
      answers: [],
    };

    await game.addPlayer(newPlayer);
    logger.info(`Player ${playerName} joined game ${gameId}`);

    return {
      player: newPlayer,
      game: this.toGameState(game),
    };
  }

  async submitAnswer(payload: SubmitAnswerRequest): Promise<GameState> {
    if (payload?.gameId == null) return Promise.reject('No gameId provided');
    const game = await Game.findOne({ gameId: payload.gameId });

    if (!game) {
      throw new AppError('GAME_NOT_FOUND', 'Game not found', 404);
    }

    const answer: Answer = {
      songId: payload.songId,
      guess: {
        artist: payload.guess.artist,
        songName: payload.guess.songName,
      },
      timestamp: new Date(payload.timestamp),
      points: 0, // Points will be calculated later
    };
    await game.addPlayerAnswer(payload.playerId, answer);
    await game.setPlayerReady(payload.playerId, true);
    logger.info(
      `Player ${payload.playerId} submitted answer for song ${payload.songId} in game ${payload.gameId}`,
    );

    return this.toGameState(game);
  }

  async allPlayersReady(gameId: string): Promise<boolean> {
    const game = await Game.findOne({ gameId });
    if (!game) {
      throw new AppError('GAME_NOT_FOUND', 'Game not found', 404);
    }
    return game.allPlayersReady();
  }

  async processRoundResults(gameId: string): Promise<RoundResult> {
    const game = await Game.findOne({ gameId });

    if (!game) {
      throw new AppError('GAME_NOT_FOUND', 'Game not found', 404);
    }
    const currentSongIndex = game.currentSong;
    const currentSongId = game.songs[currentSongIndex];
    const correctSong = await Song.findOne({ songId: currentSongId });
    if (!correctSong) {
      throw new AppError('SONG_NOT_FOUND', 'Song not found', 404);
    }
    const correctArtist = this.normalizeString(correctSong.artist);
    const correctTitle = this.normalizeString(correctSong.title);
    const playerScores: PlayerRoundScore[] = [];
    for (const player of game.players) {
      const playerAnswer = player.answers.find(
        (ans) => ans.songId === currentSongId,
      );
      let points = 0;
      let guessedArtist = '';
      let guessedTitle = '';

      if (playerAnswer) {
        guessedArtist = this.normalizeString(playerAnswer.guess.artist);
        guessedTitle = this.normalizeString(playerAnswer.guess.songName);
        if (guessedArtist === correctArtist) {
          points += 5; // Correct artist
        }
        if (guessedTitle === correctTitle) {
          points += 5; // Correct title
        }
        playerAnswer.points = points;
        player.score += points;
      } else {
        points = 0; // No answer submitted
      }
      playerScores.push({
        playerId: player.id,
        playerName: player.name,
        guess: playerAnswer
          ? {
              artist: playerAnswer.guess.artist,
              songName: playerAnswer.guess.songName,
            }
          : { artist: '', songName: '' },
        pointsEarned: points,
        totalScore: player.score,
        breakdown: {
          artistPoints: guessedArtist === correctArtist ? 5 : 0,
          songPoints: guessedTitle === correctTitle ? 5 : 0,
        },
      });
    }
    // Move to next song
    game.currentSong += 1;
    // Reset players' ready status
    await game.resetPlayersReady();
    await game.save();
    logger.info(
      `Processed round results for game ${gameId}, song index ${currentSongIndex}`,
    );

    return {
      roundNumber: currentSongIndex + 1,
      correctAnswer: {
        artist: correctSong.artist,
        songName: correctSong.title,
      },
      playerScores,
    };
  }

  /**
   * Gets final results of the game
   * @param gameId
   * @returns
   */
  async getFinalResults(gameId: string): Promise<FinalResults> {
    const game = await Game.findOne({ gameId });

    if (!game) {
      throw new AppError('GAME_NOT_FOUND', 'Game not found', 404);
    }

    const finalScores: FinalPlayerScore[] = await Promise.all(
      game.players.map(async (player) => {
        // Pre-fetch all songs used in this game for faster access
        const songs = await Song.find({ songId: { $in: game.songs } });

        const correctArtists = await Promise.all(
          player.answers.map(async (ans) => {
            const correctSong = songs.find((s) => s.songId === ans.songId);
            if (!correctSong) return false;
            return (
              this.normalizeString(ans.guess.artist) ===
              this.normalizeString(correctSong.artist)
            );
          }),
        );

        const correctSongs = await Promise.all(
          player.answers.map(async (ans) => {
            const correctSong = songs.find((s) => s.songId === ans.songId);
            if (!correctSong) return false;
            return (
              this.normalizeString(ans.guess.songName) ===
              this.normalizeString(correctSong.title)
            );
          }),
        );

        return {
          playerId: player.id,
          playerName: player.name,
          totalScore: player.score,
          placement: 0, // to be assigned later
          correctArtists: correctArtists.filter(Boolean).length,
          correctSongs: correctSongs.filter(Boolean).length,
        };
      }),
    );

    // Sort and assign placements
    finalScores.sort((a, b) => b.totalScore - a.totalScore);
    finalScores.forEach((score, index) => {
      score.placement = index + 1;
    });
    logger.info(`Calculated final results for game ${gameId}`);
    return {
      gameId,
      finalScores,
      gameSettings: game.settings,
    };
  }

  /**
   * Normalizes string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Converts IGame to GameState
   */
  private toGameState(game: IGame): GameState {
    return {
      gameId: game.gameId,
      settings: game.settings,
      players: game.players,
      creator: game.creator,
      status: game.status as any,
      currentSong: game.currentSong,
      songs: game.songs,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
    };
  }
}

export const gameService = new GameService();
