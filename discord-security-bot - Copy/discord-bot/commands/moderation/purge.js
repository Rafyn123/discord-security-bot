const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logMod } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Sterge mai multe mesaje deodata')
    .addIntegerOption(o => o.setName('count').setDescription('Cate mesaje (1-100)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const count = interaction.options.getInteger('count');
    if (count < 1 || count > 100) {
      return interaction.reply({ content: '❌ Numarul trebuie sa fie intre 1 si 100.', ephemeral: true });
    }

    const deleted = await interaction.channel.bulkDelete(count, true);
    await logMod(interaction.guild, '🧹 Purge', `**${interaction.user.tag}** a sters ${deleted.size} mesaje in #${interaction.channel.name}`);

    return interaction.reply({ content: `✅ Am sters ${deleted.size} mesaje.`, ephemeral: true });
  },
};
