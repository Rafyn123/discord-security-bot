const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const play = require('play-dl');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { connect, playNext } = require('../../utils/musicManager');

// Detectare automată yt-dlp per platformă
function getYtDlpPath() {
  const isWindows = process.platform === 'win32';
  const filename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  return path.join(__dirname, '..', '..', filename);
}

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
    const ytdlpPath = getYtDlpPath();
    
    // ✅ RĂSPUND IMEDIAT (în <3 secunde)
    if (!fs.existsSync(ytdlpPath)) {
      return await interaction.reply({
        content: `❌ yt-dlp nu a fost găsit la: ${ytdlpPath}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return await interaction.reply({
        content: '❌ Trebuie să fii într-un canal vocal.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ✅ DEFER cu flag corect
    await interaction.deferReply();
    const query = interaction.options.getString('query');

    try {
      let url = query;
      let title = query;

      // Validare dacă e link YouTube
      const validation = play.yt_validate(query);

      if (validation !== 'video') {
        // ❌ PROBLEMA: play.search() durează mult → PUT TIMEOUT
        console.log(`🔍 Caut: ${query}`);
        
        try {
          const results = await Promise.race([
            play.search(query, { limit: 1, source: { youtube: 'video' } }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout search')), 8000)
            ),
          ]);

          if (!results.length || !results[0].url) {
            return await interaction.editReply(
              '❌ Nu am găsit nicio piesă. Încearcă cu link direct de YouTube.'
            );
          }
          url = results[0].url;
          title = results[0].title || query;
        } catch (searchErr) {
          return await interaction.editReply(
            '❌ Căutarea a expirat. Încearcă cu link direct.'
          );
        }
      } else {
        title = 'Piesa cerută';
      }

      console.log(`✅ URL final: ${url} | Title: ${title}`);

      // Crează stream cu parametri anti-bot și timeout mai mare
      const ytdlp = spawn(ytdlpPath, [
        url,
        '-f', 'bestaudio',
        '-o', '-',
        '--no-playlist',
        '--quiet',
        '--no-warnings',
        '--socket-timeout', '30',  // ✅ TIMEOUT mai mare
        '--extractor-args', 'youtube:player_client=web',  // ✅ Evită autentificare YouTube
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',  // ✅ User-Agent
      ]);

      let hasError = false;
      let errorMsg = '';

      ytdlp.stderr.on('data', (data) => {
        const errMsg = data.toString();
        console.error('yt-dlp stderr:', errMsg);
        if (errMsg.includes('ERROR')) {
          hasError = true;
          errorMsg = errMsg;
        }
      });

      ytdlp.on('error', (procErr) => {
        console.error('❌ Eroare pornire yt-dlp:', procErr.message);
        hasError = true;
        errorMsg = procErr.message;
      });

      // Conectează la voice channel
      const state = await connect(voiceChannel);
      state.textChannel = interaction.channel;

      if (hasError) {
        return await interaction.editReply(
          `❌ Eroare descărcare: ${title}\n\`\`\`${errorMsg.slice(0, 200)}\`\`\``
        );
      }

      // Adaugă în coadă
      state.queue.push({
        title,
        stream: ytdlp.stdout,
        type: 'arbitrary',
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
          `❌ Eroare: ${err.message || 'Nu am putut încărca piesa'}`
        );
      } catch (editErr) {
        console.error('Nu am putut edita reply:', editErr.message);
      }
    }
  },
};
