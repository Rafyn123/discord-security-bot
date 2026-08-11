const { Events } = require('discord.js');
const antiNuke = require('../security/antiNuke');
const { getGuildConfig } = require('../utils/database');

function emergencyOff(guild) {
  return getGuildConfig(guild.id).security_level === 'emergency_disabled';
}

// Acest fisier exporta un array de "listeners" pe care index.js le inregistreaza direct,
// pentru ca sunt mai multe evenimente diferite intr-un singur modul de securitate.
module.exports = [
  {
    name: Events.ChannelDelete,
    async execute(channel) {
      if (!channel.guild || emergencyOff(channel.guild)) return;
      await antiNuke.onChannelDelete(channel);
    },
  },
  {
    name: Events.GuildRoleDelete,
    async execute(role) {
      if (emergencyOff(role.guild)) return;
      await antiNuke.onRoleDelete(role);
    },
  },
  {
    name: Events.WebhooksUpdate,
    async execute(channel) {
      if (emergencyOff(channel.guild)) return;
      await antiNuke.onWebhookUpdate(channel);
    },
  },
  {
    name: Events.GuildBanAdd,
    async execute(ban) {
      if (emergencyOff(ban.guild)) return;
      await antiNuke.onGuildBanAdd(ban);
    },
  },
  {
    name: Events.GuildMemberRemove,
    async execute(member) {
      if (emergencyOff(member.guild)) return;
      await antiNuke.onGuildMemberRemove(member);
    },
  },
];
