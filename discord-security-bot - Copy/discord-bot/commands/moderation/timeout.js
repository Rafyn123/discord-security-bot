const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canActOn } = require('../../utils/permissions');
const { logModAction } = require('../../utils/database');
const { logMod } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Pune un membru la timeout (mute temporar)')
    .addUserOption(o => o.setName('user').setDescription('Userul').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Durata in minute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Motivul').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'Niciun motiv specificat';
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) return interaction.reply({ content: '❌ Userul nu este pe server.', ephemeral: true });
    if (!canActOn(interaction.guild, targetMember)) {
      return interaction.reply({ content: '❌ Nu pot actiona asupra acestui user.', ephemeral: true });
    }
    if (minutes < 1 || minutes > 40320) {
      return interaction.reply({ content: '❌ Durata trebuie sa fie intre 1 minut si 28 zile.', ephemeral: true });
    }

    await targetMember.timeout(minutes * 60 * 1000, reason);
    logModAction(interaction.guild.id, 'TIMEOUT', targetUser.id, interaction.user.id, `${minutes}min - ${reason}`);
    await logMod(interaction.guild, '🔇 Timeout', `**${targetUser.tag}** a primit timeout ${minutes} minute de la **${interaction.user.tag}**\nMotiv: ${reason}`);

    return interaction.reply(`✅ ${targetUser.tag} a primit timeout ${minutes} minute.`);
  },
};
