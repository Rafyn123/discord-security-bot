require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const categories = fs.readdirSync(commandsPath);

for (const category of categories) {
  const categoryPath = path.join(commandsPath, category);
  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const mod = require(path.join(categoryPath, file));
    // Unele fisiere (ex: controls.js) exporta mai multe comenzi deodata
    const commandObjs = mod.data ? [mod] : Object.values(mod);
    for (const cmd of commandObjs) {
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Inregistrez ${commands.length} comenzi slash...`);

    // Foloseste guild-scoped deploy pentru testare instant. Pentru productie globala,
    // schimba pe Routes.applicationCommands(process.env.CLIENT_ID) (dureaza ~1h sa se propage).
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log(`✅ Am inregistrat ${data.length} comenzi cu succes.`);
  } catch (err) {
    console.error('❌ Eroare la deploy:', err);
  }
})();
