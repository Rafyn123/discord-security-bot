const { Events } = require('discord.js');
const { handleMessage } = require('../security/antiSpam');
const { getGuildConfig } = require('../utils/database');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;
    const config = getGuildConfig(message.guild.id);
    if (config.security_level === 'emergency_disabled') return;
    await handleMessage(message);
  },
};
