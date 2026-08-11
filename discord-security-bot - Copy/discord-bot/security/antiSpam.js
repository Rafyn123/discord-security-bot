const { logSecurityEvent } = require('../utils/database');
const { logSecurity } = require('../utils/logger');

const messageTracker = new Map(); // userId -> [{content, timestamp}]
const SPAM_MESSAGE_COUNT = 5;
const SPAM_WINDOW_MS = 7000;
const MASS_MENTION_THRESHOLD = 8;
const INVITE_REGEX = /(discord\.gg|discordapp\.com\/invite)\/\S+/i;

async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;

  const { author, guild, content, mentions } = message;

  // --- Mass mentions ---
  if (mentions.users.size + mentions.roles.size >= MASS_MENTION_THRESHOLD) {
    await flagUser(message, 'MASS_MENTION', `${author.tag} a mentionat ${mentions.users.size + mentions.roles.size} entitati intr-un mesaj`);
    return;
  }

  // --- Invite spam (doar de la conturi noi/fara rol de incredere e cel mai suspect, dar flagam oricum) ---
  if (INVITE_REGEX.test(content)) {
    logSecurityEvent(guild.id, 'INVITE_LINK', `${author.tag}: ${content.slice(0, 100)}`, author.id);
  }

  // --- Mesaje repetate / spam rapid ---
  const key = `${guild.id}-${author.id}`;
  const now = Date.now();
  const history = (messageTracker.get(key) || []).filter(m => now - m.timestamp < SPAM_WINDOW_MS);
  history.push({ content, timestamp: now });
  messageTracker.set(key, history);

  if (history.length >= SPAM_MESSAGE_COUNT) {
    const identical = history.filter(m => m.content === content).length;
    if (identical >= 3 || history.length >= SPAM_MESSAGE_COUNT) {
      await flagUser(message, 'MESSAGE_SPAM', `${author.tag} a trimis ${history.length} mesaje in ${SPAM_WINDOW_MS / 1000}s`);
      messageTracker.set(key, []);
    }
  }
}

async function flagUser(message, eventType, details) {
  const { guild, author, member } = message;
  logSecurityEvent(guild.id, eventType, details, author.id);
  await logSecurity(guild, `⚠️ Spam detectat: ${eventType}`, details);

  // Timeout scurt automat (5 minute) daca botul are permisiune si nu e cineva de incredere
  try {
    if (member && member.moderatable) {
      await member.timeout(5 * 60 * 1000, `Auto-mod: ${eventType}`);
      await logSecurity(guild, '🔇 Timeout automat', `${author.tag} a primit timeout 5 minute pentru ${eventType}.`);
    }
  } catch (err) {
    console.error('Nu am putut aplica timeout automat:', err.message);
  }
}

module.exports = { handleMessage };
