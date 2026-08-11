const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Verifica daca botul raspunde'),
  async execute(interaction) {
    return interaction.reply(`🏓 Pong! Latenta: ${interaction.client.ws.ping}ms`);
  },
};
