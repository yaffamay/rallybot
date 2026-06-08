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

function parseUtcTime(timeString) {
  if (!timeString.includes(':')) return null;

  const parts = timeString.split(':');

  if (parts.length < 2 || parts.length > 3) return null;

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

  return { hours, minutes, seconds };
}

function getNextUtcTargetDate(timeParts) {
  const now = new Date();

  const target = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    timeParts.hours,
    timeParts.minutes,
    timeParts.seconds
  ));

  // If the time already passed today, schedule for tomorrow UTC
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target;
}

function formatDuration(ms) {
  if (ms <= 0) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatUtcTime(date) {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`;
}

function buildCountdownMessage(alliance, targetDate, leaders) {
  const now = new Date();
  const msUntilHit = targetDate.getTime() - now.getTime();

  const sortedLeaders = [...leaders].sort((a, b) => b.marchTime - a.marchTime);

  let message = `⚔️ **Rally Countdown — ${alliance}**\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `🎯 **Target UTC:** ${formatUtcTime(targetDate)}\n`;
  message += `⏳ **Time to hit:** ${formatDuration(msUntilHit)}\n`;
  message += `📊 **${sortedLeaders.length} rally leaders tracked**\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  sortedLeaders.forEach((leader, index) => {
    const sendDate = new Date(targetDate.getTime() - leader.marchTime * 1000);
    const msUntilSend = sendDate.getTime() - now.getTime();

    let status;

    if (msUntilSend > 0) {
      status = `⏳ Sends in: **${formatDuration(msUntilSend)}**`;
    } else if (msUntilHit > 0) {
      status = `🚀 **SEND NOW**`;
    } else {
      status = `✅ Sent / hit complete`;
    }

    const icon = index === 0 ? '🥇' : '➡️';

    message += `${icon} **${leader.name}** — ${leader.marchTime}s\n`;
    message += `🕒 Send UTC: **${formatUtcTime(sendDate)}**\n`;
    message += `${status}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔄 Auto-updating countdown.`;

  return message;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rallycountdown')
    .setDescription('Start a live UTC countdown for rally leaders.')
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
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const timeString = interaction.options.getString('time');
    const alliance = interaction.options.getString('alliance').toUpperCase();

    const timeParts = parseUtcTime(timeString);

    if (!timeParts) {
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

    const targetDate = getNextUtcTargetDate(timeParts);

    await interaction.reply({
      content: buildCountdownMessage(alliance, targetDate, leaders)
    });

    const message = await interaction.fetchReply();

    let intervalId;

    const updateCountdown = async () => {
      const now = new Date();
      const msUntilHit = targetDate.getTime() - now.getTime();

      try {
        await message.edit({
          content: buildCountdownMessage(alliance, targetDate, leaders)
        });
      } catch (error) {
        console.error('Failed to update rally countdown:', error);
        clearInterval(intervalId);
        return;
      }

      if (msUntilHit <= -10000) {
        clearInterval(intervalId);

        try {
          await message.edit({
            content: buildCountdownMessage(alliance, targetDate, leaders).replace(
              '🔄 Auto-updating countdown.',
              '✅ Countdown complete.'
            )
          });
        } catch (error) {
          console.error('Failed to finalize rally countdown:', error);
        }
      }
    };

    // Update every 5 seconds first
    intervalId = setInterval(updateCountdown, 5000);

    // During final minute, update every second
    const finalMinuteCheck = setInterval(() => {
      const now = new Date();
      const msUntilHit = targetDate.getTime() - now.getTime();

      if (msUntilHit <= 60000 && msUntilHit > -10000) {
        clearInterval(intervalId);
        clearInterval(finalMinuteCheck);
        intervalId = setInterval(updateCountdown, 1000);
      }

      if (msUntilHit <= -10000) {
        clearInterval(finalMinuteCheck);
      }
    }, 5000);
  }
};
