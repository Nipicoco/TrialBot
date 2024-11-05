import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import trialManager from './trialManager.js';

export function createKeyManagementEmbed() {
  const unusedCount = trialManager.getRemainingCodesCount();
  const usedCodes = trialManager.getUsedCodes();
  
  const embed = new EmbedBuilder()
    .setColor('#FF5733')
    .setTitle('Trial Key Management')
    .addFields(
      { name: 'Available Keys', value: `${unusedCount}`, inline: true },
      { name: 'Used Keys', value: `${Object.keys(usedCodes).length}`, inline: true }
    )
    .setDescription('Manage your trial keys below')
    .setTimestamp();

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('view-keys')
        .setLabel('View Keys')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('add-key')
        .setLabel('Add Single Key')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('bulk-add')
        .setLabel('Bulk Add Keys')
        .setStyle(ButtonStyle.Success)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('delete-key')
        .setLabel('Delete Key')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('view-used')
        .setLabel('View Used Keys')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('wipe-keys')
        .setLabel('Wipe All Keys')
        .setStyle(ButtonStyle.Danger)
    );

  return { embed, components: [row1, row2] };
} 