const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbFile = path.join(dataDir, 'bot.json');

function loadDB() {
  if (!fs.existsSync(dbFile)) {
    const initial = { guildConfigs: {}, modActions: [], securityEvents: [], joinLog: [] };
    fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch {
    return { guildConfigs: {}, modActions: [], securityEvents: [], joinLog: [] };
  }
}

function saveDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function getGuildConfig(guildId) {
  const data = loadDB();
  if (!data.guildConfigs[guildId]) {
    data.guildConfigs[guildId] = {
      guild_id: guildId,
      trusted_role_id: null,
      log_channel_id: null,
      security_channel_id: null,
      mod_channel_id: null,
      voice_channel_log_id: null,
      lockdown_active: 0,
      security_level: 'normal',
    };
    saveDB(data);
  }
  return data.guildConfigs[guildId];
}

function updateGuildConfig(guildId, fields) {
  getGuildConfig(guildId); // asigura ca randul exista
  const freshData = loadDB();
  freshData.guildConfigs[guildId] = { ...freshData.guildConfigs[guildId], ...fields };
  saveDB(freshData);
}

function logModAction(guildId, action, targetId, moderatorId, reason) {
  const data = loadDB();
  data.modActions.push({
    guild_id: guildId,
    action,
    target_id: targetId,
    moderator_id: moderatorId,
    reason: reason || 'N/A',
    created_at: Date.now(),
  });
  saveDB(data);
}

function logSecurityEvent(guildId, eventType, details, executorId) {
  const data = loadDB();
  data.securityEvents.push({
    guild_id: guildId,
    event_type: eventType,
    details,
    executor_id: executorId || null,
    created_at: Date.now(),
  });
  saveDB(data);
}

function recordJoin(guildId, userId) {
  const data = loadDB();
  data.joinLog.push({ guild_id: guildId, user_id: userId, joined_at: Date.now() });
  if (data.joinLog.length > 500) {
    data.joinLog = data.joinLog.slice(-500);
  }
  saveDB(data);
}

function countRecentJoins(guildId, windowMs) {
  const data = loadDB();
  const since = Date.now() - windowMs;
  return data.joinLog.filter(j => j.guild_id === guildId && j.joined_at >= since).length;
}

module.exports = {
  getGuildConfig,
  updateGuildConfig,
  logModAction,
  logSecurityEvent,
  recordJoin,
  countRecentJoins,
};
