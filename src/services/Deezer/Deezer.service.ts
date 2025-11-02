// deezerService.ts
import fetch from 'node-fetch';
import { logger } from '../../utils/logger';

interface DeezerTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  preview_url: string;
  release_date: string;
  cover: string;
}

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
): Promise<DeezerTrack[]> {
  // Fetch genres to get genre ID
  const res = await fetch('https://api.deezer.com/genre');
  const genresJson: any = await res.json();
  const genreObj = genresJson.data.find(
    (g: any) => g.name.toLowerCase() === genre.toLowerCase(),
  );

  // Fetch top tracks for the genre
  const genreId = genreObj.id;
  const tracksRes = await fetch(
    `https://api.deezer.com/chart/${genreId}/tracks?limit=${limit}`,
  );
  const tracksJson: any = await tracksRes.json();

  // Convert to Song format
  const songs = tracksJson.data.map((song: any) => {
    return {
      songId: song.id,
      title: song.title,
      artist: song.artist.name,
      album: song.album.title,
      audioUrl: song.preview,
      duration: song.duration,
      genre: genreObj.name,
      year: 0,
    };
  });

  logger.info(`Fetched songs ${JSON.stringify(songs)}`);

  return songs;
}
