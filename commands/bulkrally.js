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

function loadRallies() {
  ensureDataFile();

  const rawData = fs.readFileSync(dataPath, 'utf8');

  if (!rawData.trim()) {
    return {};
  }

  return JSON.parse(rawData);
}

function saveRallies(rallies) {
  fs.writeFileSync(dataPath, JSON.stringify(rallies, null, 2));
}

function parseLeaders(input) {
  return input
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const match = item.match(/^(.+?)\s+(\d+)$/);

      if (!match) {
        return null;
      }

      const name = match[1].trim();
      const marchTime = parseInt(match[2], 10);

      if (!name || Number.isNaN(marchTime) || marchTime <= 0) {
        return null;
      }

      return {
        name,
        marchTime
      };
    });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bulkrally')
    .setDescription('Add or update multiple rally leaders at once.')
    .addStringOption(option =>
      option
        .setName('alliance')
        .setDescription('Alliance abbreviation, like PFR, ELF, NERD')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('leaders')
        .setDescription('Example: gains 36, yaff 34, Boon 34, flem 31')
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const alliance = interaction.options.getString('alliance').toUpperCase();
    const leadersInput = interaction.options.getString('leaders');

    const parsedLeaders = parseLeaders(leadersInput);

    if (parsedLeaders.length === 0 || parsedLeaders.some(leader => leader === null)) {
      return interaction.reply({
        content:
          'Invalid format. Use comma-separated leaders like:\n`gains 36, yaff 34, Boon 34, flem 31`',
        ephemeral: true
      });
    }

    const rallies = loadRallies();

    if (!rallies[guildId]) {
      rallies[guildId] = {};
    }

    if (!rallies[guildId][alliance]) {
      rallies[guildId][alliance] = [];
    }

    for (const leaderData of parsedLeaders) {
      const existingIndex = rallies[guildId][alliance].findIndex(
        leader => leader.name.toLowerCase() === leaderData.name.toLowerCase()
      );

      if (existingIndex >= 0) {
        rallies[guildId][alliance][existingIndex] = leaderData;
      } else {
        rallies[guildId][alliance].push(leaderData);
      }
    }

    rallies[guildId][alliance].sort((a, b) => b.marchTime - a.marchTime);

    saveRallies(rallies);

    let response = `✅ Saved **${parsedLeaders.length}** rally leaders for **${alliance}**\n\n`;

    parsedLeaders
      .sort((a, b) => b.marchTime - a.marchTime)
      .forEach(leader => {
        response += `• **${leader.name}** — ${leader.marchTime}s\n`;
      });

    response += `\nUse **/sendorder** or **/rallytimer** to view the send order.`;

    return interaction.reply({
      content: response,
      ephemeral: true
    });
  }
};
