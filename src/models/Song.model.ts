// src/models/Song.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the song interface without extending Document yet
interface ISongBase {
  songId: string;
  artist: string;
  title: string;
  audioUrl: string;
  duration: number;
  genre: string;
  year: string;
  albumCover?: string;
}

export interface ISongDocument extends ISongBase, Document {}

export interface ISongModel extends Model<ISongDocument> {
  getRandomSongs(
    count: number,
    genres?: string[],
    years?: string[],
  ): Promise<ISongDocument[]>;
  addSongs(songs: ISongBase[]): Promise<ISongDocument[]>;
}

const SongSchema = new Schema<ISongDocument, ISongModel>(
  {
    songId: { type: String, required: true, unique: true, index: true },
    artist: { type: String, required: true, index: true },
    title: { type: String, required: true, index: true },
    audioUrl: { type: String, required: true },
    duration: { type: Number, default: 30 },
    genre: { type: String, required: true, index: true },
    year: { type: String, index: true },
    albumCover: { type: String },
  },
  { timestamps: true },
);

// Compound index for filtering
SongSchema.index({ genre: 1, year: 1 });

// Virtual to return 'id' for compatibility with frontend
SongSchema.virtual('id').get(function () {
  return this.songId;
});

// Ensure virtuals are included in JSON
SongSchema.set('toJSON', { virtuals: true });
SongSchema.set('toObject', { virtuals: true });

// Static method to get random songs based on filters
SongSchema.statics.getRandomSongs = async function (
  count: number,
  genres?: string[],
  years?: string[],
): Promise<ISongDocument[]> {
  const query: any = {};

  if (genres?.length) query.genre = { $in: genres };
  if (years?.length) query.year = { $in: years };

  return this.aggregate([{ $match: query }, { $sample: { size: count } }]);
};

SongSchema.statics.addSongs = async function (
  songs: ISongBase[],
): Promise<ISongDocument[]> {
  const bulkOps = songs.map((song) => ({
    updateOne: {
      filter: { songId: song.songId },
      update: {
        // Always update these fields
        $set: {
          title: song.title,
          artist: song.artist,
          audioUrl: song.audioUrl, // 🔥 ensures fresh URL each time
          albumCover: song.albumCover,
          genre: song.genre,
          duration: song.duration,
          year: song.year,
        },
        // Only insert if new
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  await this.bulkWrite(bulkOps);
  const songIds = songs.map((s) => s.songId);
  return this.find({ songId: { $in: songIds } });
};

export const Song = mongoose.model<ISongDocument, ISongModel>(
  'Song',
  SongSchema,
);
