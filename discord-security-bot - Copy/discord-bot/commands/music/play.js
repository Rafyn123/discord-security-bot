const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { connect, playNext } = require('../../utils/musicManager');

// ===== FUNCȚIE NOUĂ PENTRU yt-dlp (ÎNLOCUIEȘTE play-dl) =====
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

// Calea către executabilul yt-dlp
const ytDlpPath = path.join(__dirname, '../../yt-dlp');

async function getYtInfo(url) {
  try {
    const { stdout, stderr } = await execPromise(`"${ytDlpPath}" -j "${url}"`);
    if (stderr && stderr.includes('ERROR')) {
      throw new Error(stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error('❌ Eroare la obținerea info:', error.message);
    throw error;
  }
}

async function getYtStream(url) {
  try {
    // Folosește yt-dlp pentru a obține URL-ul stream-ului audio
    const { stdout } = await execPromise(
      `"${ytDlpPath}" -f bestaudio -g "${url}"`
    );
    const audioUrl = stdout.trim();
    if (!audioUrl) throw new Error('Nu s-a găsit stream audio');
    return audioUrl;
  } catch (error) {
    console.error('❌ Eroare la obținerea stream:', error.message);
    throw error;
  }
}

// Funcție pentru căutare YouTube
async function searchYoutube(query) {
  try {
    const { stdout } = await execPromise(
      `"${ytDlpPath}" -j "ytsearch1:${query}"`
    );
    const data = JSON.parse(stdout);
    if (!data || !data.url) throw new Error('Nu s-a găsit niciun rezultat');
    return {
      url: data.url,
      title: data.title || query
    };
  } catch (error) {
    console.error('❌ Eroare la căutare:', error.message);
    throw error;
  }
}
// ============================================================

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reda o melodie de pe YouTube, Spotify sau Soundcloud')
    .addStringOption((o) =>
      o
        .setName('query')
        .setDescription('Link YouTube/Spotify/Soundcloud sau nume piesa')
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

      console.log(`🔍 Caut: ${query}`);

      // Verifică dacă este link sau text de căutare
      const isUrl = query.startsWith('http://') || query.startsWith('https://');
      
      if (isUrl) {
        // Link direct - obține informații
        try {
          const info = await getYtInfo(query);
          url = info.url || query;
          title = info.title || query;
          audioUrl = await getYtStream(url);
        } catch (err) {
          return await interaction.editReply(
            `❌ Eroare la procesarea link-ului: ${err.message.substring(0, 100)}`
          );
        }
      } else {
        // Căutare
        try {
          const result = await searchYoutube(query);
          url = result.url;
          title = result.title;
          audioUrl = await getYtStream(url);
        } catch (err) {
          return await interaction.editReply(
            `❌ Nu am găsit nicio piesă: ${err.message.substring(0, 100)}`
          );
        }
      }

      console.log(`✅ URL final: ${url} | Title: ${title}`);

      // Verifică dacă audioUrl există
      if (!audioUrl) {
        return await interaction.editReply('❌ Nu s-a putut obține stream-ul audio.');
      }

      // Conectează
      const state = await connect(voiceChannel);
      state.textChannel = interaction.channel;

      // Adaugă în coadă (folosește audioUrl ca stream)
      state.queue.push({
        title,
        stream: audioUrl,  // Folosește URL-ul direct
        type: 'arbitrary',
        url: url
      });

      if (!state.playing) {
        playNext(interaction.guild.id);
        return await interaction.editReply(`🎵 Se reda acum: **${title}**`);
      } else {
        return await interaction.editReply(
          `➕ Adaugat în coadă: **${title}** (poziția ${state.queue.length})`
        );
      }
    } catch (err) {
      console.error('❌ Eroare /play:', err.message);
      try {
        return await interaction.editReply(
          `❌ Eroare: ${err.message.substring(0, 100)}`
        );
      } catch (editErr) {
        console.error('Nu am putut edita reply');
      }
    }
  },
};

