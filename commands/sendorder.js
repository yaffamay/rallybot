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

function buildSendOrderMessage(alliance, countdown, leaders) {
  const sortedLeaders = [...leaders].sort((a, b) => b.marchTime - a.marchTime);
  const shortestMarch = Math.min(...sortedLeaders.map(leader => leader.marchTime));

  let message = `⚔️ **March Timing — Send Order**\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `⏱️ **Countdown:** ${countdown}s | All marches arrive at **0s**\n`;
  message += `🏰 **Alliance:** ${alliance}\n`;
  message += `📊 **${sortedLeaders.length} rally leaders tracked**\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  sortedLeaders.forEach((leader, index) => {
    const sendAt = leader.marchTime - shortestMarch;
    const previousLeader = sortedLeaders[index - 1];

    if (index === 0) {
      message += `🥇 **${leader.name}** — ${leader.marchTime}s ← **Send FIRST**\n`;
    } else {
      const previousSendAt = previousLeader.marchTime - shortestMarch;
      const secondsAfterPrevious = previousSendAt - sendAt;

      if (secondsAfterPrevious === 0) {
        message += `➡️ **${leader.name}** — ${leader.marchTime}s ← Send **same time** as **${previousLeader.name}**\n`;
      } else {
        message += `➡️ **${leader.name}** — ${leader.marchTime}s ← Send **${secondsAfterPrevious}s after ${previousLeader.name}**\n`;
      }
    }

    message += `🧭 Countdown: Send at **${sendAt}s**\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📝 Use **/setrally** to add or update a rally leader.\n`;

  return message;
}
module.exports = {
  data: new SlashCommandBuilder()
    .setName('sendorder')
    .setDescription('Show rally leader send order by march time.')
    .addStringOption(option =>
      option
        .setName('alliance')
        .setDescription('Alliance abbreviation, like NERD, HOT, ATG')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('countdown')
        .setDescription('Countdown timer length in seconds, usually 10')
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const alliance = interaction.options.getString('alliance').toUpperCase();
    const countdown = interaction.options.getInteger('countdown') || 10;

    const rallies = loadRallies();

    if (!rallies[guildId] || !rallies[guildId][alliance]) {
      return interaction.reply({
        content: `No rally leaders found for **${alliance}** yet. Use /setrally first.`,
        ephemeral: true
      });
    }

    const leaders = rallies[guildId][alliance];

    if (leaders.length === 0) {
      return interaction.reply({
        content: `No rally leaders found for **${alliance}** yet. Use /setrally first.`,
        ephemeral: true
      });
    }

    const response = buildSendOrderMessage(alliance, countdown, leaders);

    await interaction.reply({
      content: response
    });
  }
};
