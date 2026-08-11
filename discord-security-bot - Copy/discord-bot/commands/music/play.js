const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { connect, playNext } = require('../../utils/musicManager');
const { getSpotifyInfo } = require('../../utils/spotify');

// ===== FUNCȚII PENTRU YOUTUBE =====
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

const ytDlpPath = path.join(__dirname, '../../yt-dlp');

async function searchYoutube(query) {
  try {
    const { stdout } = await execPromise(`"${ytDlpPath}" -j "ytsearch1:${query}"`);
    const data = JSON.parse(stdout);
    if (!data || !data.url) throw new Error('Nu s-a găsit niciun rezultat');
    return {
      url: data.url,
      title: data.title || query
    };
  } catch (error) {
    console.error('❌ Eroare căutare YouTube:', error.message);
    throw new Error(`YouTube: ${error.message}`);
  }
}

async function getYtStream(url) {
  try {
    const { stdout } = await execPromise(
      `"${ytDlpPath}" -f bestaudio -g "${url}"`
    );
    const audioUrl = stdout.trim();
    if (!audioUrl) throw new Error('Nu s-a găsit stream audio');
    return audioUrl;
  } catch (error) {
    console.error('❌ Eroare stream YouTube:', error.message);
    throw new Error(`YouTube Stream: ${error.message}`);
  }
}
// =================================

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
          
          // Caută pe YouTube folosind numele de pe Spotify
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
          // Link direct YouTube
          try {
            const info = await searchYoutube(query);
            url = info.url;
            title = info.title;
          } catch (err) {
            return await interaction.editReply(
              `❌ Eroare YouTube: ${err.message.substring(0, 150)}`
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
