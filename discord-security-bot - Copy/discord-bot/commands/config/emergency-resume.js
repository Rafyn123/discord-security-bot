const { SlashCommandBuilder } = require('discord.js');
const { isTrusted } = require('../../utils/permissions');
const { updateGuildConfig } = require('../../utils/database');
const { logSecurity } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emergency-resume')
    .setDescription('Reactiveaza sistemul automat de securitate dupa emergency mode'),

  async execute(interaction) {
    if (!isTrusted(interaction)) {
      return interaction.reply({ content: '❌ Doar owner-ul sau un rol de incredere poate folosi aceasta comanda.', ephemeral: true });
    }

    updateGuildConfig(interaction.guild.id, { security_level: 'normal' });
    await logSecurity(interaction.guild, '✅ Emergency mode dezactivat', `${interaction.user.tag} a reactivat sistemul automat de securitate.`);

    return interaction.reply('✅ Sistemul automat de securitate a fost reactivat.');
  },
};
