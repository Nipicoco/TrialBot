import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function createTrialEmbed() {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Get Your Trial Code')
    .setDescription('Click the button below to get your unique trial code!')
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('request-trial')
    .setLabel('Request Trial')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🎮');

  const row = new ActionRowBuilder()
    .addComponents(button);

  return { embed, row };
} 