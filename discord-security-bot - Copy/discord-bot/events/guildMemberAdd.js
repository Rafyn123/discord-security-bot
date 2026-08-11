const { Events } = require('discord.js');
const { handleMemberJoin } = require('../security/antiRaid');
const { getGuildConfig } = require('../utils/database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const config = getGuildConfig(member.guild.id);
    if (config.security_level === 'emergency_disabled') return;
    await handleMemberJoin(member);
  },
};
