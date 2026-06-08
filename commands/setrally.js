const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'rallies.json');

function ensureDataFile() {
  const dataDir = path.dirname(dataPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrally')
    .setDescription('Add or update a rally leader march time.')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Rally leader name')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('march_time')
        .setDescription('March time in seconds')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('alliance')
        .setDescription('Alliance abbreviation, like NERD, HOT, ATG')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const name = interaction.options.getString('name');
    const marchTime = interaction.options.getInteger('march_time');
    const alliance = interaction.options.getString('alliance').toUpperCase();

    ensureDataFile();

    const rawData = fs.readFileSync(dataPath, 'utf8');
    const rallies = JSON.parse(rawData);

    if (!rallies[guildId]) {
      rallies[guildId] = {};
    }

    if (!rallies[guildId][alliance]) {
      rallies[guildId][alliance] = [];
    }

    const existingIndex = rallies[guildId][alliance].findIndex(
      leader => leader.name.toLowerCase() === name.toLowerCase()
    );

    const leaderData = {
      name,
      marchTime
    };

    if (existingIndex >= 0) {
      rallies[guildId][alliance][existingIndex] = leaderData;
    } else {
      rallies[guildId][alliance].push(leaderData);
    }

    rallies[guildId][alliance].sort((a, b) => b.marchTime - a.marchTime);

    fs.writeFileSync(dataPath, JSON.stringify(rallies, null, 2));

    await interaction.reply({
      content: `✅ Set **${name}** as a rally leader for **${alliance}** with a **${marchTime}s** march time.`,
      ephemeral: true
    });
  }
};
