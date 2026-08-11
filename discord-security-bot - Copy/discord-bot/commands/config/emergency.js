const { SlashCommandBuilder } = require('discord.js');
const { isTrusted } = require('../../utils/permissions');
const { updateGuildConfig } = require('../../utils/database');
const { logSecurity } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emergency')
    .setDescription('Kill switch: dezactiveaza toate actiunile automate periculoase ale botului')
    .addBooleanOption(o => o.setName('confirm').setDescription('Trebuie true pentru a confirma').setRequired(true)),

  async execute(interaction) {
    if (!isTrusted(interaction)) {
      return interaction.reply({ content: '❌ Doar owner-ul sau un rol de incredere poate folosi aceasta comanda.', ephemeral: true });
    }

    const confirm = interaction.options.getBoolean('confirm');
    if (!confirm) {
      return interaction.reply({ content: '⚠️ Ruleaza din nou cu `confirm:true` pentru a activa emergency mode.', ephemeral: true });
    }

    updateGuildConfig(interaction.guild.id, { security_level: 'emergency_disabled' });
    await logSecurity(interaction.guild, '🛑 EMERGENCY MODE', `${interaction.user.tag} a dezactivat toate actiunile automate de securitate ale botului. Foloseste \`/emergency-resume\` pentru a reactiva.`);

    return interaction.reply('🛑 Emergency mode activat. Botul NU va mai lua actiuni automate (anti-raid, anti-nuke, timeout automat). Actiunile manuale (/ban, /kick etc) inca functioneaza.');
  },
};
