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

function formatTimeFromSeconds(totalSeconds) {
  totalSeconds = ((totalSeconds % 86400) + 86400) % 86400;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseUtcTime(timeString) {
  if (!timeString.includes(':')) {
    return null;
  }

  const parts = timeString.split(':');

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts[2] ? parseInt(parts[2], 10) : 0;

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function buildRallyTimerMessage(alliance, targetTimeString, targetTimeInSeconds, countdown, leaders) {
  const sortedLeaders = [...leaders].sort((a, b) => b.marchTime - a.marchTime);
  const shortestMarch = Math.min(...sortedLeaders.map(leader => leader.marchTime));

  let message = `⚔️ **Rally Timer — Send Order**\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `🎯 **Target UTC:** ${formatTimeFromSeconds(targetTimeInSeconds)}\n`;
  message += `🏰 **Alliance:** ${alliance}\n`;
  message += `⏱️ **Countdown:** ${countdown}s | All marches arrive at **0s**\n`;
  message += `📊 **${sortedLeaders.length} rally leaders tracked**\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  sortedLeaders.forEach((leader, index) => {
    const sendAtCountdown = leader.marchTime - shortestMarch;
    const sendUtcSeconds = targetTimeInSeconds - leader.marchTime;
    const sendUtcTime = formatTimeFromSeconds(sendUtcSeconds);
    const previousLeader = sortedLeaders[index - 1];

    if (index === 0) {
      message += `🥇 **${leader.name}** — ${leader.marchTime}s ← **Send FIRST**\n`;
    } else {
      const previousSendAt = previousLeader.marchTime - shortestMarch;
      const secondsAfterPrevious = previousSendAt - sendAtCountdown;

      if (secondsAfterPrevious === 0) {
        message += `➡️ **${leader.name}** — ${leader.marchTime}s ← Send **same time** as **${previousLeader.name}**\n`;
      } else {
        message += `➡️ **${leader.name}** — ${leader.marchTime}s ← Send **${secondsAfterPrevious}s after ${previousLeader.name}**\n`;
      }
    }

    message += `🕒 UTC Send Time: **${sendUtcTime}**\n`;
    message += `🧭 Countdown: Send at **${sendAtCountdown}s**\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📝 Use **/setrally** to add or update a rally leader.\n`;

  return message;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rallytimer')
    .setDescription('Show rally send order with exact UTC send times.')
    .addStringOption(option =>
      option
        .setName('time')
        .setDescription('Target UTC hit time in HH:MM or HH:MM:SS format')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('alliance')
        .setDescription('Alliance abbreviation, like PFR, ELF, NERD')
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
    const timeString = interaction.options.getString('time');
    const alliance = interaction.options.getString('alliance').toUpperCase();
    const countdown = interaction.options.getInteger('countdown') || 10;

    const targetTimeInSeconds = parseUtcTime(timeString);

    if (targetTimeInSeconds === null) {
      return interaction.reply({
        content: 'Invalid time format. Use **HH:MM** or **HH:MM:SS**, like `12:45` or `12:45:00`.',
        ephemeral: true
      });
    }

    const rallies = loadRallies();

    if (!rallies[guildId] || !rallies[guildId][alliance]) {
      return interaction.reply({
        content: `No rally leaders found for **${alliance}** yet. Use /setrally first.`,
        ephemeral: true
      });
    }

    const leaders = rallies[guildId][alliance];

    if (!leaders || leaders.length === 0) {
      return interaction.reply({
        content: `No rally leaders found for **${alliance}** yet. Use /setrally first.`,
        ephemeral: true
      });
    }

    const response = buildRallyTimerMessage(
      alliance,
      timeString,
      targetTimeInSeconds,
      countdown,
      leaders
    );

    await interaction.reply({
      content: response
    });
  }
};
