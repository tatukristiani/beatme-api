// src/scripts/seedSongs.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Song } from '../models/Song.model';
import { logger } from '../utils/logger';

dotenv.config();

// Sample songs data - Replace with your actual song data
const sampleSongs = [
  {
    songId: uuidv4(),
    artist: "The Beatles",
    title: "Hey Jude",
    audioUrl: "https://example.com/songs/hey-jude.mp3",
    duration: 30,
    genre: "Rock",
    year: "1960s",
    albumCover: "https://example.com/covers/hey-jude.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Queen",
    title: "Bohemian Rhapsody",
    audioUrl: "https://example.com/songs/bohemian-rhapsody.mp3",
    duration: 30,
    genre: "Rock",
    year: "1970s",
    albumCover: "https://example.com/covers/bohemian.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Michael Jackson",
    title: "Billie Jean",
    audioUrl: "https://example.com/songs/billie-jean.mp3",
    duration: 30,
    genre: "Pop",
    year: "1980s",
    albumCover: "https://example.com/covers/billie-jean.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Nirvana",
    title: "Smells Like Teen Spirit",
    audioUrl: "https://example.com/songs/smells-like-teen-spirit.mp3",
    duration: 30,
    genre: "Rock",
    year: "1990s",
    albumCover: "https://example.com/covers/nirvana.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Eminem",
    title: "Lose Yourself",
    audioUrl: "https://example.com/songs/lose-yourself.mp3",
    duration: 30,
    genre: "Hip Hop",
    year: "2000s",
    albumCover: "https://example.com/covers/eminem.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Adele",
    title: "Rolling in the Deep",
    audioUrl: "https://example.com/songs/rolling-in-the-deep.mp3",
    duration: 30,
    genre: "Pop",
    year: "2010s",
    albumCover: "https://example.com/covers/adele.jpg"
  },
  {
    songId: uuidv4(),
    artist: "The Weeknd",
    title: "Blinding Lights",
    audioUrl: "https://example.com/songs/blinding-lights.mp3",
    duration: 30,
    genre: "Pop",
    year: "2020s",
    albumCover: "https://example.com/covers/weeknd.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Led Zeppelin",
    title: "Stairway to Heaven",
    audioUrl: "https://example.com/songs/stairway.mp3",
    duration: 30,
    genre: "Rock",
    year: "1970s",
    albumCover: "https://example.com/covers/led-zeppelin.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Whitney Houston",
    title: "I Will Always Love You",
    audioUrl: "https://example.com/songs/i-will-always-love-you.mp3",
    duration: 30,
    genre: "Pop",
    year: "1990s",
    albumCover: "https://example.com/covers/whitney.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Drake",
    title: "God's Plan",
    audioUrl: "https://example.com/songs/gods-plan.mp3",
    duration: 30,
    genre: "Hip Hop",
    year: "2010s",
    albumCover: "https://example.com/covers/drake.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Pink Floyd",
    title: "Comfortably Numb",
    audioUrl: "https://example.com/songs/comfortably-numb.mp3",
    duration: 30,
    genre: "Rock",
    year: "1970s",
    albumCover: "https://example.com/covers/pink-floyd.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Madonna",
    title: "Like a Prayer",
    audioUrl: "https://example.com/songs/like-a-prayer.mp3",
    duration: 30,
    genre: "Pop",
    year: "1980s",
    albumCover: "https://example.com/covers/madonna.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Coldplay",
    title: "Viva la Vida",
    audioUrl: "https://example.com/songs/viva-la-vida.mp3",
    duration: 30,
    genre: "Pop",
    year: "2000s",
    albumCover: "https://example.com/covers/coldplay.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Bob Marley",
    title: "No Woman No Cry",
    audioUrl: "https://example.com/songs/no-woman-no-cry.mp3",
    duration: 30,
    genre: "R&B",
    year: "1970s",
    albumCover: "https://example.com/covers/bob-marley.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Taylor Swift",
    title: "Shake It Off",
    audioUrl: "https://example.com/songs/shake-it-off.mp3",
    duration: 30,
    genre: "Pop",
    year: "2010s",
    albumCover: "https://example.com/covers/taylor-swift.jpg"
  },
  {
    songId: uuidv4(),
    artist: "AC/DC",
    title: "Back in Black",
    audioUrl: "https://example.com/songs/back-in-black.mp3",
    duration: 30,
    genre: "Rock",
    year: "1980s",
    albumCover: "https://example.com/covers/acdc.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Beyoncé",
    title: "Crazy in Love",
    audioUrl: "https://example.com/songs/crazy-in-love.mp3",
    duration: 30,
    genre: "Pop",
    year: "2000s",
    albumCover: "https://example.com/covers/beyonce.jpg"
  },
  {
    songId: uuidv4(),
    artist: "The Rolling Stones",
    title: "Paint It Black",
    audioUrl: "https://example.com/songs/paint-it-black.mp3",
    duration: 30,
    genre: "Rock",
    year: "1960s",
    albumCover: "https://example.com/covers/rolling-stones.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Bruno Mars",
    title: "Uptown Funk",
    audioUrl: "https://example.com/songs/uptown-funk.mp3",
    duration: 30,
    genre: "Pop",
    year: "2010s",
    albumCover: "https://example.com/covers/bruno-mars.jpg"
  },
  {
    songId: uuidv4(),
    artist: "Fleetwood Mac",
    title: "Dreams",
    audioUrl: "https://example.com/songs/dreams.mp3",
    duration: 30,
    genre: "Rock",
    year: "1970s",
    albumCover: "https://example.com/covers/fleetwood-mac.jpg"
  }
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beatme';
    
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Clear existing songs
    logger.info('Clearing existing songs...');
    await Song.deleteMany({});
    logger.info('Existing songs cleared');

    // Insert sample songs
    logger.info('Inserting sample songs...');
    await Song.insertMany(sampleSongs);
    logger.info(`Successfully inserted ${sampleSongs.length} songs`);

    logger.info('Database seeding completed!');
    
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();