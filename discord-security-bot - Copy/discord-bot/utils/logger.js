const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('./database');

const COLORS = {
  security: 0xE74C3C,
  mod: 0xF39C12,
  voice: 0x3498DB,
  info: 0x2ECC71,
};

async function sendLog(guild, channelIdField, title, description, color = 'info') {
  try {
    const config = getGuildConfig(guild.id);
    const channelId = config[channelIdField];
    if (!channelId) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(COLORS[color] || COLORS.info)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Eroare la trimiterea log-ului:', err.message);
  }
}

const logSecurity = (guild, title, desc) => sendLog(guild, 'security_channel_id', title, desc, 'security');
const logMod = (guild, title, desc) => sendLog(guild, 'mod_channel_id', title, desc, 'mod');
const logVoice = (guild, title, desc) => sendLog(guild, 'voice_channel_log_id', title, desc, 'voice');

module.exports = { logSecurity, logMod, logVoice, sendLog };
