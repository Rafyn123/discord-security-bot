require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// --- Incarca toate comenzile din commands/<categorie>/*.js ---
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const mod = require(path.join(categoryPath, file));
      // controls.js exporta mai multe comenzi ca obiect { pause, resume, ... }
      const commandObjs = mod.data ? [mod] : Object.values(mod);

      for (const cmd of commandObjs) {
        if (cmd.data && cmd.execute) {
          client.commands.set(cmd.data.name, cmd);
        }
      }
    }
  }
  console.log(`Am incarcat ${client.commands.size} comenzi.`);
}

// --- Incarca event handlers din events/*.js ---
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const mod = require(path.join(eventsPath, file));
    // antiNukeEvents.js exporta un array de mai multe evenimente
    const eventList = Array.isArray(mod) ? mod : [mod];

    for (const evt of eventList) {
      if (evt.once) {
        client.once(evt.name, (...args) => evt.execute(...args));
      } else {
        client.on(evt.name, (...args) => evt.execute(...args));
      }
    }
  }
  console.log('Am incarcat toate event handler-ele.');
}

// --- Handler central pentru slash commands ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Eroare la executarea comenzii ${interaction.commandName}:`, err);
    const errorMsg = { content: '❌ A aparut o eroare la executarea comenzii.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot pornit ca ${c.user.tag}`);
});

loadCommands();
loadEvents();

client.login(process.env.DISCORD_TOKEN);
