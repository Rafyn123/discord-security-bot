const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canActOn } = require('../../utils/permissions');
const { logModAction } = require('../../utils/database');
const { logMod } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Da afara un membru din server')
    .addUserOption(o => o.setName('user').setDescription('Userul de dat afara').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Motivul').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Niciun motiv specificat';
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) return interaction.reply({ content: '❌ Userul nu este pe server.', ephemeral: true });
    if (!canActOn(interaction.guild, targetMember)) {
      return interaction.reply({ content: '❌ Nu pot actiona asupra acestui user.', ephemeral: true });
    }

    await targetMember.kick(reason);
    logModAction(interaction.guild.id, 'KICK', targetUser.id, interaction.user.id, reason);
    await logMod(interaction.guild, '👢 Kick', `**${targetUser.tag}** a fost dat afara de **${interaction.user.tag}**\nMotiv: ${reason}`);

    return interaction.reply(`✅ ${targetUser.tag} a fost dat afara. Motiv: ${reason}`);
  },
};
