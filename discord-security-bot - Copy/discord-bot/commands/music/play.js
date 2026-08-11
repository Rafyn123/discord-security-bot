const { SlashCommandBuilder } = require('discord.js');
const play = require('play-dl');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { connect, playNext } = require('../../utils/musicManager');

// Calea catre binarul yt-dlp.exe, descarcat manual si pus in radacina proiectului
// (langa package.json). Vezi README pentru link de descarcare.
const YTDLP_PATH = path.join(__dirname, '..', '..', 'yt-dlp.exe');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reda o melodie de pe YouTube')
    .addStringOption(o => o.setName('query').setDescription('Link YouTube sau numele piesei').setRequired(true)),

  async execute(interaction) {
    if (!fs.existsSync(YTDLP_PATH)) {
      return interaction.reply({
        content: '❌ Lipseste yt-dlp.exe din radacina proiectului. Vezi README, sectiunea "Music player - instalare yt-dlp".',
        ephemeral: true,
      });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Trebuie sa fii intr-un canal vocal.', ephemeral: true });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('query');

    try {
      let url = query;
      let title = query;

      const validation = play.yt_validate(query);

      if (validation !== 'video') {
        const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
        if (!results.length || !results[0].url) {
          return interaction.editReply('❌ Nu am gasit nicio piesa valida cu acest nume. Incearca cu link direct de YouTube.');
        }
        url = results[0].url;
        title = results[0].title || query;
      } else {
        title = 'piesa cerută';
      }

      console.log('URL folosit pentru stream (yt-dlp):', url);

      const ytdlp = spawn(YTDLP_PATH, [
        url,
        '-f', 'bestaudio',
        '-o', '-',
        '--no-playlist',
        '--quiet',
        '--no-warnings',
      ]);

      ytdlp.stderr.on('data', (data) => {
        console.error('yt-dlp stderr:', data.toString());
      });

      const state = await connect(voiceChannel);
      state.textChannel = interaction.channel;

      ytdlp.on('error', (procErr) => {
        console.error('Eroare la pornirea yt-dlp:', procErr.message);
        state.textChannel.send(`❌ Nu am putut porni descarcarea pentru "${title}".`).catch(() => {});
        playNext(interaction.guild.id);
      });

      state.queue.push({ title, stream: ytdlp.stdout, type: 'arbitrary' });

      if (!state.playing) {
        playNext(interaction.guild.id);
        return interaction.editReply(`🎵 Se reda acum: **${title}**`);
      } else {
        return interaction.editReply(`➕ Adaugat in coada: **${title}** (pozitia ${state.queue.length})`);
      }
    } catch (err) {
      console.error('Eroare /play:', err);
      return interaction.editReply('❌ Eroare la incarcarea piesei. Incearca alt link.');
    }
  },
};
