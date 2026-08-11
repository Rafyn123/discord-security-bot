const { getGuildConfig, updateGuildConfig, recordJoin, countRecentJoins, logSecurityEvent } = require('../utils/database');
const { logSecurity } = require('../utils/logger');

const JOIN_THRESHOLD = parseInt(process.env.RAID_JOIN_THRESHOLD || '10', 10);
const JOIN_WINDOW_MS = parseInt(process.env.RAID_JOIN_WINDOW_MS || '10000', 10);

// Conturi create recent = suspecte (sub 7 zile)
const NEW_ACCOUNT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

async function handleMemberJoin(member) {
  const { guild, user } = member;
  recordJoin(guild.id, user.id);

  const accountAge = Date.now() - user.createdTimestamp;
  const isNewAccount = accountAge < NEW_ACCOUNT_THRESHOLD_MS;

  if (isNewAccount) {
    logSecurityEvent(guild.id, 'NEW_ACCOUNT_JOIN', `${user.tag} (cont creat acum ${Math.floor(accountAge / 3600000)}h)`, user.id);
  }

  const recentJoins = countRecentJoins(guild.id, JOIN_WINDOW_MS);

  if (recentJoins >= JOIN_THRESHOLD) {
    await triggerRaidMode(guild, recentJoins);
  }
}

async function triggerRaidMode(guild, joinCount) {
  const config = getGuildConfig(guild.id);
  if (config.lockdown_active) return; // deja in lockdown

  updateGuildConfig(guild.id, { lockdown_active: 1, security_level: 'raid' });

  logSecurityEvent(guild.id, 'RAID_DETECTED', `${joinCount} membri au intrat in ultimele ${JOIN_WINDOW_MS / 1000}s`);

  await logSecurity(
    guild,
    '🚨 RAID DETECTAT',
    `**${joinCount}** utilizatori au intrat in ultimele ${JOIN_WINDOW_MS / 1000} secunde.\n` +
    `Serverul a intrat automat in **lockdown**.\n` +
    `Membrii noi vor avea acces restrictionat pana cand un moderator dezactiveaza modul cu \`/lockdown confirm:false\`.`
  );

  // Restrictioneaza rolul @everyone sa trimita mesaje (lockdown soft)
  try {
    const everyoneRole = guild.roles.everyone;
    await everyoneRole.setPermissions(
      everyoneRole.permissions.remove(['SendMessages', 'CreateInstantInvite']),
      'Raid mode - lockdown automat'
    );
  } catch (err) {
    console.error('Nu am putut aplica lockdown pe @everyone:', err.message);
  }
}

async function liftLockdown(guild) {
  updateGuildConfig(guild.id, { lockdown_active: 0, security_level: 'normal' });

  try {
    const everyoneRole = guild.roles.everyone;
    await everyoneRole.setPermissions(
      everyoneRole.permissions.add(['SendMessages', 'CreateInstantInvite']),
      'Lockdown ridicat manual'
    );
  } catch (err) {
    console.error('Nu am putut ridica lockdown-ul:', err.message);
  }

  await logSecurity(guild, '✅ Lockdown ridicat', 'Serverul a revenit la starea normala.');
}

module.exports = { handleMemberJoin, triggerRaidMode, liftLockdown };
