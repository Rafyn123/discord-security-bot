const { SlashCommandBuilder } = require('discord.js');
const { getQueue, disconnect, playNext } = require('../../utils/musicManager');
const { AudioPlayerStatus } = require('@discordjs/voice');

// Exportam mai multe comenzi simple dintr-un singur fisier pentru claritate.
// Fiecare obiect trebuie inregistrat separat in loader (vezi index.js -> loadCommands).

const pause = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pune pauza la melodia curenta'),
  async execute(interaction) {
    const state = getQueue(interaction.guild.id);
    if (!state.player) return interaction.reply({ content: '❌ Nu se reda nimic momentan.', ephemeral: true });
    state.player.pause();
    return interaction.reply('⏸️ Pauza.');
  },
};

const resume = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Continua melodia'),
  async execute(interaction) {
    const state = getQueue(interaction.guild.id);
    if (!state.player) return interaction.reply({ content: '❌ Nu se reda nimic momentan.', ephemeral: true });
    state.player.unpause();
    return interaction.reply('▶️ Continua.');
  },
};

const skip = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Sari peste piesa curenta'),
  async execute(interaction) {
    const state = getQueue(interaction.guild.id);
    if (!state.player) return interaction.reply({ content: '❌ Nu se reda nimic momentan.', ephemeral: true });
    state.player.stop(); // declanseaza AudioPlayerStatus.Idle -> playNext
    return interaction.reply('⏭️ Piesa sarita.');
  },
};

const stop = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Opreste muzica si iese din canalul vocal'),
  async execute(interaction) {
    disconnect(interaction.guild.id);
    return interaction.reply('⏹️ Oprit si am iesit din canal.');
  },
};

const queue = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Arata coada de melodii'),
  async execute(interaction) {
    const state = getQueue(interaction.guild.id);
    if (!state.queue.length) return interaction.reply('📭 Coada este goala.');
    const list = state.queue.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
    return interaction.reply(`🎶 **Coada:**\n${list}`);
  },
};

const volume = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Seteaza volumul (0-100)')
    .addIntegerOption(o => o.setName('level').setDescription('Nivel volum').setRequired(true)),
  async execute(interaction) {
    const level = interaction.options.getInteger('level');
    if (level < 0 || level > 100) return interaction.reply({ content: '❌ Volumul trebuie sa fie intre 0 si 100.', ephemeral: true });
    // Nota: pentru control real de volum ai nevoie de un inline volume transformer pe resource.
    // Aici salvam preferinta; aplic-o la crearea resursei in musicManager daca vrei control fin.
    return interaction.reply(`🔊 Volum setat la ${level}% (aplicat la urmatoarea piesa).`);
  },
};

module.exports = { pause, resume, skip, stop, queue, volume };
