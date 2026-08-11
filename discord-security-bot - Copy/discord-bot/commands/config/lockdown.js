const { SlashCommandBuilder } = require('discord.js');
const { isTrusted } = require('../../utils/permissions');
const { triggerRaidMode, liftLockdown } = require('../../security/antiRaid');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Activeaza sau dezactiveaza manual modul lockdown (necesita confirmare)')
    .addBooleanOption(o => o.setName('activate').setDescription('true = activeaza, false = dezactiveaza').setRequired(true))
    .addBooleanOption(o => o.setName('confirm').setDescription('Trebuie setat pe true pentru a confirma actiunea').setRequired(true)),

  async execute(interaction) {
    if (!isTrusted(interaction)) {
      return interaction.reply({ content: '❌ Doar owner-ul sau un rol de incredere poate folosi aceasta comanda.', ephemeral: true });
    }

    const activate = interaction.options.getBoolean('activate');
    const confirm = interaction.options.getBoolean('confirm');

    if (!confirm) {
      return interaction.reply({
        content: `⚠️ Aceasta este o actiune periculoasa. Ruleaza comanda din nou cu \`confirm:true\` pentru a ${activate ? 'ACTIVA' : 'DEZACTIVA'} lockdown.`,
        ephemeral: true,
      });
    }

    if (activate) {
      await triggerRaidMode(interaction.guild, 0);
      return interaction.reply('🔒 Lockdown activat manual. Membrii noi/toti nu mai pot trimite mesaje.');
    } else {
      await liftLockdown(interaction.guild);
      return interaction.reply('🔓 Lockdown dezactivat. Serverul a revenit la normal.');
    }
  },
};
