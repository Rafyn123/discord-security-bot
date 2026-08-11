const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('./database');

/**
 * Verifica daca userul are voie sa foloseasca o comanda periculoasa
 * (owner de server SAU rolul de incredere setat in config)
 */
function isTrusted(interaction) {
  if (interaction.guild.ownerId === interaction.user.id) return true;

  const config = getGuildConfig(interaction.guild.id);
  const trustedRoleId = config.trusted_role_id || process.env.TRUSTED_ROLE_ID;

  if (!trustedRoleId) return false;

  return interaction.member.roles.cache.has(trustedRoleId);
}

function hasPermission(interaction, permissionFlag) {
  return interaction.member.permissions.has(permissionFlag);
}

/**
 * Verifica daca botul poate actiona asupra unui membru
 * (nu poate actiona asupra cuiva cu rol mai mare sau egal cu al lui)
 */
function canActOn(guild, targetMember) {
  const botMember = guild.members.me;
  if (!botMember) return false;
  if (targetMember.id === guild.ownerId) return false;
  return botMember.roles.highest.position > targetMember.roles.highest.position;
}

module.exports = { isTrusted, hasPermission, canActOn, PermissionFlagsBits };
