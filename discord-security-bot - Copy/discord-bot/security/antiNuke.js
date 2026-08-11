const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { logSecurityEvent } = require('../utils/database');
const { logSecurity } = require('../utils/logger');

// Urmarim cate actiuni distructive a facut fiecare user intr-o fereastra scurta de timp
const actionTracker = new Map(); // key: `${guildId}-${executorId}` -> [timestamps]

const DESTRUCTIVE_THRESHOLD = 5; // 5 actiuni distructive
const DESTRUCTIVE_WINDOW_MS = 15000; // in 15 secunde

async function getExecutor(guild, auditLogType, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditLogType, limit: 5 });
    const entry = logs.entries.find(e => !targetId || e.target?.id === targetId);
    return entry ? entry.executor : null;
  } catch {
    return null;
  }
}

async function trackDestructiveAction(guild, executor, eventType, details) {
  if (!executor || executor.bot) return; // ignoram actiuni facute de boti (inclusiv acest bot)

  logSecurityEvent(guild.id, eventType, details, executor.id);

  const key = `${guild.id}-${executor.id}`;
  const now = Date.now();
  const timestamps = (actionTracker.get(key) || []).filter(t => now - t < DESTRUCTIVE_WINDOW_MS);
  timestamps.push(now);
  actionTracker.set(key, timestamps);

  if (timestamps.length >= DESTRUCTIVE_THRESHOLD) {
    await respondToNuke(guild, executor, timestamps.length);
    actionTracker.set(key, []); // reset dupa raspuns
  }
}

async function respondToNuke(guild, executor, actionCount) {
  await logSecurity(
    guild,
    '🛑 ANTI-NUKE DECLANSAT',
    `<@${executor.id}> (${executor.tag}) a facut **${actionCount}** actiuni distructive in ultimele ${DESTRUCTIVE_WINDOW_MS / 1000}s.\n` +
    `Se incearca eliminarea permisiunilor periculoase.`
  );

  try {
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    // Nu actiona asupra owner-ului
    if (member.id === guild.ownerId) {
      await logSecurity(guild, '⚠️ Atentie', 'Executorul este owner-ul serverului - nu pot restrictiona automat.');
      return;
    }

    // Scoate rolurile care dau permisiuni periculoase
    const dangerousRoles = member.roles.cache.filter(role =>
      role.permissions.has(PermissionFlagsBits.Administrator) ||
      role.permissions.has(PermissionFlagsBits.ManageGuild) ||
      role.permissions.has(PermissionFlagsBits.ManageRoles) ||
      role.permissions.has(PermissionFlagsBits.ManageChannels) ||
      role.permissions.has(PermissionFlagsBits.BanMembers)
    );

    for (const [, role] of dangerousRoles) {
      if (role.editable) {
        await member.roles.remove(role, 'Anti-nuke: activitate distructiva detectata');
      }
    }

    await logSecurity(guild, '✅ Actiune luata', `Am eliminat ${dangerousRoles.size} rol(uri) periculoase de la ${executor.tag}. Verifica manual si alerteaza owner-ul.`);
  } catch (err) {
    console.error('Eroare la raspunsul anti-nuke:', err.message);
    await logSecurity(guild, '❌ Eroare anti-nuke', `Nu am putut restrictiona automat: ${err.message}`);
  }
}

// --- Handlere pentru evenimente specifice ---

async function onChannelDelete(channel) {
  if (!channel.guild) return;
  const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
  await trackDestructiveAction(channel.guild, executor, 'CHANNEL_DELETE', `Canal sters: #${channel.name}`);
}

async function onRoleDelete(role) {
  const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
  await trackDestructiveAction(role.guild, executor, 'ROLE_DELETE', `Rol sters: ${role.name}`);
}

async function onWebhookUpdate(channel) {
  const executor = await getExecutor(channel.guild, AuditLogEvent.WebhookCreate);
  await trackDestructiveAction(channel.guild, executor, 'WEBHOOK_CHANGE', `Webhook modificat in #${channel.name}`);
}

async function onGuildBanAdd(ban) {
  const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  await trackDestructiveAction(ban.guild, executor, 'MEMBER_BAN', `${ban.user.tag} a fost banat`);
}

async function onGuildMemberRemove(member) {
  // Detectam kick-uri prin audit log (leave normal nu apare aici cu executor)
  const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
  if (executor) {
    await trackDestructiveAction(member.guild, executor, 'MEMBER_KICK', `${member.user.tag} a fost dat afara`);
  }
}

module.exports = {
  onChannelDelete,
  onRoleDelete,
  onWebhookUpdate,
  onGuildBanAdd,
  onGuildMemberRemove,
  trackDestructiveAction,
};
