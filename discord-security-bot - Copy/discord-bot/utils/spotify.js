const spotifyUrl = require('spotify-url-info');

/**
 * Extrage informații dintr-un link Spotify
 * Funcționează cu cont Free - nu necesită autentificare!
 */
async function getSpotifyInfo(url) {
  try {
    console.log(`🎵 Procesez link Spotify: ${url}`);
    const data = await spotifyUrl.getData(url);
    
    // Verifică tipul de conținut
    if (data.type === 'track') {
      const artist = data.artists && data.artists[0] ? data.artists[0].name : 'Artist necunoscut';
      const title = data.name || 'Titlu necunoscut';
      return {
        title: `${artist} - ${title}`,
        artist: artist,
        track: title,
        query: `${artist} ${title} audio`,
        isPlaylist: false
      };
    }
    
    if (data.type === 'playlist' || data.type === 'album') {
      // Pentru playlist/album, ia primul track
      const tracks = data.tracks && data.tracks.items ? data.tracks.items : [];
      if (tracks.length > 0) {
        const firstTrack = tracks[0].track || tracks[0];
        const artist = firstTrack.artists && firstTrack.artists[0] ? firstTrack.artists[0].name : 'Artist necunoscut';
        const title = firstTrack.name || 'Titlu necunoscut';
        return {
          title: `${artist} - ${title}`,
          artist: artist,
          track: title,
          query: `${artist} ${title} audio`,
          isPlaylist: true,
          playlistName: data.name || 'Playlist'
        };
      }
    }
    
    throw new Error('Nu s-a putut extrage informații din link-ul Spotify');
  } catch (error) {
    console.error('❌ Eroare la procesarea Spotify:', error.message);
    throw new Error(`Spotify: ${error.message}`);
  }
}

module.exports = { getSpotifyInfo };
