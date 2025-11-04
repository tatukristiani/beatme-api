// deezerService.ts
import fetch from 'node-fetch';
import { logger } from '../../utils/logger';
import { Song } from '../../types';

/*
 Possible genres from Deezer API:
    132: Pop
    116: Rap/Hip Hop
    152: Rock
    113: Dance
    165: R&B
    144: Reggae
    464: Metal
    39: Iskelmä
    197: Latin Music
*/
export async function getDeezerTracksByGenre(
  genre: string,
  limit: number,
  years: string[],
): Promise<any[]> {
  // Fetch genres to get genre ID
  const res = await fetch('https://api.deezer.com/genre');
  const genresJson: any = await res.json();
  const genreObj = genresJson.data.find(
    (g: any) => g.name.toLowerCase() === genre.toLowerCase(),
  );

  // Fetch top tracks for the genre
  const genreId = genreObj.id;
  const tracksRes = await fetch(
    `https://api.deezer.com/chart/${genreId}/tracks?limit=1000`,
  );
  const tracksJson: any = await tracksRes.json();
  const shuffledTracks = tracksJson.data.sort(() => Math.random() - 0.5);
  const minYear = Math.min(...years.map(Number));
  const maxYear = Math.max(...years.map(Number));
  const finalTracks: any[] = [];

  for (const track of shuffledTracks) {
    try {
      // fetch album info to get release date
      const res = await fetch(`https://api.deezer.com/album/${track.album.id}`);
      const album: any = await res.json();

      const releaseYear = new Date(album.release_date).getFullYear();

      if (releaseYear >= minYear && releaseYear <= maxYear) {
        finalTracks.push({ ...track, release_date: album.release_date });

        // ✅ Stop early if enough matches found
        if (finalTracks.length >= limit) break;
      }
    } catch (err) {
      logger.error(`Error fetching album for track ${track.id}:`, err);
    }
  }

  // Convert to Song format
  const songs: any[] = finalTracks.map((song: any) => {
    return {
      songId: song.id,
      title: song.title,
      artist: song.artist.name,
      album: song.album.title,
      audioUrl: song.preview,
      duration: song.duration,
      genre: genreObj.name,
      year: song.release_year,
    };
  });

  logger.info(`Fetched songs ${JSON.stringify(songs)}`);

  return songs;
}
