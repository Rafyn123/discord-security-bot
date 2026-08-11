const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canActOn } = require('../../utils/permissions');
const { logModAction } = require('../../utils/database');
const { logMod } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banneaza un membru din server')
    .addUserOption(o => o.setName('user').setDescription('Userul de banat').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Motivul').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Niciun motiv specificat';
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember && !canActOn(interaction.guild, targetMember)) {
      return interaction.reply({ content: '❌ Nu pot actiona asupra acestui user (rol egal/mai mare sau e owner).', ephemeral: true });
    }

    await interaction.guild.members.ban(targetUser.id, { reason });
    logModAction(interaction.guild.id, 'BAN', targetUser.id, interaction.user.id, reason);
    await logMod(interaction.guild, '🔨 Ban', `**${targetUser.tag}** a fost banat de **${interaction.user.tag}**\nMotiv: ${reason}`);

    return interaction.reply(`✅ ${targetUser.tag} a fost banat. Motiv: ${reason}`);
  },
};
