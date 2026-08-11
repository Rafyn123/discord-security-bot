const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { connect, playNext } = require('../../utils/musicManager');
const { getSpotifyInfo } = require('../../utils/spotify');

// ===== YOUTUBE API v3 =====
const { google } = require('googleapis');
const youtube = google.youtube({ 
  version: 'v3', 
  auth: process.env.YOUTUBE_API_KEY 
});

// ===== YT-DLP DOAR PENTRU STREAM =====
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs');

// Detectează platforma
const isWindows = process.platform === 'win32';
let ytDlpPath = path.join(__dirname, '../../yt-dlp');
if (isWindows) {
  ytDlpPath += '.exe';
}

if (!fs.existsSync(ytDlpPath)) {
  console.warn(`⚠️ yt-dlp nu a fost găsit la: ${ytDlpPath}`);
  console.warn(`⚠️ Încerc să folosesc din PATH...`);
  ytDlpPath = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
}

console.log(`📍 Folosesc yt-dlp: ${ytDlpPath}`);

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
}

// ===== CĂUTARE CU API YOUTUBE =====
async function searchYoutube(query) {
  try {
    console.log(`🔍 Caut cu API: ${query}`);
    const response = await withTimeout(
      youtube.search.list({
        part: 'snippet',
        q: query,
        maxResults: 1,
        type: 'video'
      }),
      10000,
      'Timeout API YouTube'
    );
    
    const video = response.data.items[0];
    if (!video) throw new Error('Nu s-a găsit niciun rezultat');
    
    console.log(`✅ Găsit: ${video.snippet.title}`);
    return {
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      title: video.snippet.title || query
    };
  } catch (error) {
    console.error('❌ Eroare API YouTube:', error.message);
    throw new Error(`YouTube API: ${error.message}`);
  }
}

// ===== OBȚINE STREAM AUDIO =====
async function getYtStream(url) {
  try {
    await sleep(1000);
    const result = await withTimeout(
      execPromise(
        `"${ytDlpPath}" -f bestaudio -g --user-agent "${userAgent}" "${url}"`
      ),
      15000,
      'Timeout yt-dlp'
    );
    const audioUrl = result.stdout.trim();
    if (!audioUrl) throw new Error('Nu s-a găsit stream audio');
    return audioUrl;
  } catch (error) {
    console.error('❌ Eroare stream:', error.message);
    throw new Error(`Stream: ${error.message}`);
  }
}
// ===================================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reda o melodie de pe YouTube sau Spotify')
    .addStringOption((o) =>
      o
        .setName('query')
        .setDescription('Link YouTube/Spotify sau nume piesa')
        .setRequired(true)
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return await interaction.reply({
        content: '❌ Trebuie să fii într-un canal vocal.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('query');

    try {
      let url = query;
      let title = query;
      let audioUrl;
      let isSpotify = false;

      console.log(`🔍 Caut: ${query}`);

      // ===== DETECTARE SPOTIFY =====
      if (query.includes('spotify.com')) {
        isSpotify = true;
        try {
          const spotifyData = await getSpotifyInfo(query);
          title = spotifyData.title;
          console.log(`🎵 Spotify: ${spotifyData.query}`);
          const youtubeResult = await searchYoutube(spotifyData.query);
          url = youtubeResult.url;
          title = spotifyData.title;
          console.log(`✅ YouTube URL: ${url}`);
        } catch (spotifyErr) {
          return await interaction.editReply(
            `❌ Eroare Spotify: ${spotifyErr.message.substring(0, 150)}`
          );
        }
      }

      // ===== PROCESARE YOUTUBE =====
      if (!isSpotify) {
        const isUrl = query.startsWith('http://') || query.startsWith('https://');
        if (isUrl) {
          // Link direct - extragem titlul cu API
          try {
            const result = await searchYoutube(query);
            url = query;
            title = result.title;
          } catch (err) {
            return await interaction.editReply(
              `❌ Eroare: ${err.message.substring(0, 150)}`
            );
          }
        } else {
          // Căutare text
          try {
            const result = await searchYoutube(query);
            url = result.url;
            title = result.title;
          } catch (err) {
            return await interaction.editReply(
              `❌ Nu am găsit nicio piesă: ${err.message.substring(0, 150)}`
            );
          }
        }
      }

      // ===== OBȚINE STREAM =====
      audioUrl = await getYtStream(url);
      if (!audioUrl) {
        return await interaction.editReply('❌ Nu s-a putut obține stream-ul audio.');
      }

      // ===== CONECTEAZĂ ȘI REDĂ =====
      const state = await connect(voiceChannel);
      state.textChannel = interaction.channel;

      state.queue.push({
        title,
        stream: audioUrl,
        type: 'arbitrary',
        url: url
      });

      if (!state.playing) {
        playNext(interaction.guild.id);
        return await interaction.editReply(`🎵 Se redă acum: **${title}**`);
      } else {
        return await interaction.editReply(
          `➕ Adăugat în coadă: **${title}** (poziția ${state.queue.length})`
        );
      }
    } catch (err) {
      console.error('❌ Eroare /play:', err.message);
      try {
        return await interaction.editReply(
          `❌ Eroare: ${err.message.substring(0, 150)}`
        );
      } catch (editErr) {
        console.error('Nu am putut edita reply');
        await interaction.followUp({ content: '❌ A apărut o eroare.', ephemeral: true });
      }
    }
  },
};
