// src/models/Game.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { GameState, Player, GameSettings, Answer } from '../types';

export interface IGame extends Document, Omit<GameState, 'gameId'> {
  gameId: string;

  // instance methods
  addPlayer(player: Player): Promise<IGame>;
  removePlayer(playerId: string): Promise<IGame>;
  updatePlayerScore(playerId: string, points: number): Promise<IGame>;
  setPlayerReady(playerId: string, isReady: boolean): Promise<IGame>;
  resetPlayersReady(): Promise<IGame>;
  allPlayersReady(): boolean;
  addPlayerAnswer(playerId: string, answer: Answer): Promise<IGame>;
}

export interface IGameModel extends Model<IGame> {
  createGame(settings: GameSettings, creator: string): Promise<IGame>;
}

const AnswerSchema = new Schema<Answer>(
  {
    songId: { type: String, required: true },
    guess: {
      artist: { type: String, default: '' },
      songName: { type: String, default: '' },
    },
    timestamp: { type: Date, required: true },
    points: { type: Number, default: 0 },
  },
  { _id: false },
);

const PlayerSchema = new Schema<Player>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
    isReady: { type: Boolean, default: false },
    answers: [AnswerSchema],
    socketId: { type: String },
  },
  { _id: false },
);

const GameSettingsSchema = new Schema<GameSettings>(
  {
    creatorName: { type: String, required: true },
    timePerSong: { type: Number, required: true },
    songCount: { type: Number, required: true },
    genres: [{ type: String }],
    years: [{ type: String }],
  },
  { _id: false },
);

const GameSchema = new Schema<IGame>(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    settings: {
      type: GameSettingsSchema,
      required: true,
    },
    players: [PlayerSchema],
    creator: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['lobby', 'countdown', 'playing', 'finished'],
      default: 'lobby',
    },
    currentSong: {
      type: Number,
      default: 0,
    },
    songs: [{ type: String }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// Index for cleanup of old games
GameSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24 hours

// Methods
GameSchema.methods.addPlayer = function (player: Player) {
  this.players.push(player);
  return this.save();
};

GameSchema.methods.removePlayer = function (playerId: string) {
  this.players = this.players.filter((p: Player) => p.id !== playerId);
  return this.save();
};

GameSchema.methods.updatePlayerScore = function (
  playerId: string,
  points: number,
) {
  const player = this.players.find((p: Player) => p.id === playerId);
  if (player) {
    player.score += points;
  }
  return this.save();
};

GameSchema.methods.setPlayerReady = function (
  playerId: string,
  isReady: boolean,
) {
  const player = this.players.find((p: Player) => p.id === playerId);
  if (player) {
    player.isReady = isReady;
  }
  return this.save();
};

GameSchema.methods.resetPlayersReady = function () {
  this.players.forEach((player: Player) => {
    player.isReady = false;
  });
  return this.save();
};

GameSchema.methods.allPlayersReady = function (): boolean {
  return (
    this.players.length > 0 && this.players.every((p: Player) => p.isReady)
  );
};

GameSchema.statics.createGame = async function (
  settings: GameSettings,
  creator: string,
) {
  const game = new this({
    gameId: crypto.randomUUID(), // generate a GUID
    settings,
    creator,
    players: [],
  });

  return game.save();
};

GameSchema.methods.addPlayerAnswer = async function (
  playerId: string,
  answer: Answer,
) {
  const player = this.players.find((p: Player) => p.id === playerId);
  if (!player) {
    throw new Error(`Player with ID ${playerId} not found`);
  }

  // Add the new answer to the player's answers array
  player.answers.push(answer);

  // Optionally: update readiness or scoring logic here later if needed
  return this.save();
};

export const Game = mongoose.model<IGame, IGameModel>('Game', GameSchema);
