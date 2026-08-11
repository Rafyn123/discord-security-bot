const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configureaza canalele de log si rolul de incredere pentru bot')
    .addChannelOption(o => o.setName('security_log').setDescription('Canal pentru alerte de securitate (raid/nuke/spam)'))
    .addChannelOption(o => o.setName('mod_log').setDescription('Canal pentru actiuni de moderare (ban/kick/timeout)'))
    .addChannelOption(o => o.setName('voice_log').setDescription('Canal pentru log-uri de voice (recordinguri)'))
    .addRoleOption(o => o.setName('trusted_role').setDescription('Rolul care poate folosi comenzi periculoase'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const securityLog = interaction.options.getChannel('security_log');
    const modLog = interaction.options.getChannel('mod_log');
    const voiceLog = interaction.options.getChannel('voice_log');
    const trustedRole = interaction.options.getRole('trusted_role');

    const fields = {};
    if (securityLog) fields.security_channel_id = securityLog.id;
    if (modLog) fields.mod_channel_id = modLog.id;
    if (voiceLog) fields.voice_channel_log_id = voiceLog.id;
    if (trustedRole) fields.trusted_role_id = trustedRole.id;

    if (Object.keys(fields).length === 0) {
      return interaction.reply({ content: '❌ Specifica cel putin o optiune de configurat.', ephemeral: true });
    }

    updateGuildConfig(interaction.guild.id, fields);

    const summary = [
      securityLog ? `Security log: ${securityLog}` : null,
      modLog ? `Mod log: ${modLog}` : null,
      voiceLog ? `Voice log: ${voiceLog}` : null,
      trustedRole ? `Rol de incredere: ${trustedRole}` : null,
    ].filter(Boolean).join('\n');

    return interaction.reply(`✅ Configurare salvata:\n${summary}`);
  },
};
