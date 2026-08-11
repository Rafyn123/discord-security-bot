const { SlashCommandBuilder } = require('discord.js');
const { startRecording, stopRecording, isRecording } = require('../../utils/voiceRecorder');
const { logVoice } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('record')
    .setDescription('Porneste sau opreste inregistrarea audio a canalului vocal')
    .addSubcommand(sub => sub.setName('start').setDescription('Porneste inregistrarea'))
    .addSubcommand(sub => sub.setName('stop').setDescription('Opreste inregistrarea')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const voiceChannel = interaction.member.voice.channel;

    if (sub === 'start') {
      if (!voiceChannel) {
        return interaction.reply({ content: '❌ Trebuie sa fii intr-un canal vocal.', ephemeral: true });
      }
      if (isRecording(interaction.guild.id)) {
        return interaction.reply({ content: '❌ Exista deja o inregistrare activa.', ephemeral: true });
      }

      await startRecording(voiceChannel, interaction.user);

      // Notificare EXPLICITA si vizibila ca inregistrarea e activa - obligatoriu
      await interaction.reply(`🔴 **Inregistrare pornita** in ${voiceChannel} de catre ${interaction.user}.\nToti participantii sunt informati ca aceasta sesiune este inregistrata.`);
      await logVoice(interaction.guild, '🔴 Inregistrare pornita', `Canal: ${voiceChannel.name}\nPornita de: ${interaction.user.tag}`);
      return;
    }

    if (sub === 'stop') {
      if (!isRecording(interaction.guild.id)) {
        return interaction.reply({ content: '❌ Nu exista nicio inregistrare activa.', ephemeral: true });
      }

      const result = stopRecording(interaction.guild.id);
      const durationSec = Math.round(result.durationMs / 1000);

      await interaction.reply(`⏹️ Inregistrare oprita. Durata: ${durationSec}s. Fisierele au fost salvate local (format PCM brut - necesita conversie cu ffmpeg pentru redare).`);
      await logVoice(interaction.guild, '⏹️ Inregistrare oprita', `Oprita de: ${interaction.user.tag}\nDurata: ${durationSec}s\nCale: ${result.sessionDir}`);
      return;
    }
  },
};
