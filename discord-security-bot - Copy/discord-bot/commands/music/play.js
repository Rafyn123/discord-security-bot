const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const play = require('play-dl');
const { connect, playNext } = require('../../utils/musicManager');

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
      let stream;

      console.log(`🔍 Caut: ${query}`);

      // Validare link
      const validation = play.yt_validate(query);

      if (validation !== 'video') {
        // Căutare
        try {
          const results = await Promise.race([
            play.search(query, { limit: 1, source: { youtube: 'video' } }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout search')), 10000)
            ),
          ]);

          if (!results.length || !results[0].url) {
            return await interaction.editReply(
              '❌ Nu am găsit nicio piesă. Încearcă cu link direct.'
            );
          }
          url = results[0].url;
          title = results[0].title || query;
        } catch (searchErr) {
          return await interaction.editReply(
            '❌ Căutarea a expirat. Încearcă cu link direct.'
          );
        }
      }

      console.log(`✅ URL final: ${url} | Title: ${title}`);

      // Stream direct cu play-dl
      try {
        stream = await play.stream(url);
        if (!stream) {
          return await interaction.editReply('❌ Piesa nu e disponibilă.');
        }
      } catch (streamErr) {
        console.error('❌ Eroare stream:', streamErr.message);
        return await interaction.editReply(
          `❌ Eroare: ${streamErr.message.substring(0, 100)}`
        );
      }

      // Conectează
      const state = await connect(voiceChannel);
      state.textChannel = interaction.channel;

      // Adaugă în coadă
      state.queue.push({
        title,
        stream: stream.stream,
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
          `❌ Eroare: ${err.message.substring(0, 100)}`
        );
      } catch (editErr) {
        console.error('Nu am putut edita reply');
      }
    }
  },
};
