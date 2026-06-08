const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'rallies.json');

function loadRallies() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(rawData);
}

function saveRallies(rallies) {
  fs.writeFileSync(dataPath, JSON.stringify(rallies, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearrally')
    .setDescription('Clear saved rally leaders for one alliance or all alliances.')
    .addStringOption(option =>
      option
        .setName('alliance')
        .setDescription('Alliance abbreviation to clear, like PFR or ELF. Leave blank to clear all.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const allianceInput = interaction.options.getString('alliance');
    const rallies = loadRallies();

    if (!rallies[guildId]) {
      return interaction.reply({
        content: 'No rally leaders are saved for this server yet.',
        ephemeral: true
      });
    }

    if (allianceInput) {
      const alliance = allianceInput.toUpperCase();

      if (!rallies[guildId][alliance]) {
        return interaction.reply({
          content: `No rally leaders found for **${alliance}**.`,
          ephemeral: true
        });
      }

      delete rallies[guildId][alliance];
      saveRallies(rallies);

      return interaction.reply({
        content: `🧹 Cleared all rally leaders for **${alliance}**.`,
        ephemeral: true
      });
    }

    delete rallies[guildId];
    saveRallies(rallies);

    return interaction.reply({
      content: '🧹 Cleared **all** rally leaders for this server.',
      ephemeral: true
    });
  }
};
