import { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import trialManager from '../utils/trialManager.js';
import { createKeyManagementEmbed } from '../utils/keyManagementEmbed.js';
import rateLimiter from '../utils/rateLimiter.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isButton()) {
        switch (interaction.customId) {
          case 'request-trial':
            await handleTrialRequest(interaction);
            break;
          case 'view-keys':
            await handleViewKeys(interaction);
            break;
          case 'add-key':
            await handleAddKeyModal(interaction);
            break;
          case 'bulk-add':
            await handleBulkAddModal(interaction);
            break;
          case 'delete-key':
            await handleDeleteKeyModal(interaction);
            break;
          case 'view-used':
            await handleViewUsedKeys(interaction);
            break;
        }
      } else if (interaction.isModalSubmit()) {
        switch (interaction.customId) {
          case 'add-key-modal':
            await handleAddKeySubmit(interaction);
            break;
          case 'bulk-add-modal':
            await handleBulkAddSubmit(interaction);
            break;
          case 'delete-key-modal':
            await handleDeleteKeySubmit(interaction);
            break;
        }
      }
    } catch (error) {
      console.error('Error in interaction handler:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'There was an error processing your request.',
          ephemeral: true
        });
      }
    }
  }
};

async function handleTrialRequest(interaction) {
  const userId = interaction.user.id;
  
  await interaction.deferReply({ ephemeral: true });

  if (rateLimiter.isBlacklisted(userId)) {
    const remainingMinutes = rateLimiter.getBlacklistRemaining(userId);
    await interaction.editReply({
      content: `⛔ You have been temporarily blacklisted from requesting trial codes due to spam. Please try again in ${remainingMinutes} minutes.`
    });
    return;
  }

  if (!rateLimiter.checkAndAddAttempt(userId)) {
    await interaction.editReply({
      content: '⚠️ You are clicking too fast! You have been temporarily blacklisted for 1 hour.'
    });
    return;
  }

  const existingTrial = trialManager.getUserTrial(userId);

  if (existingTrial) {
    await interaction.editReply({
      content: `You've already received a trial code. Your code is: ${existingTrial}`
    });
    return;
  }

  const trialCode = trialManager.getTrialCode(userId);
  
  if (!trialCode) {
    await interaction.editReply({
      content: 'Sorry, there are no trial codes available at the moment.'
    });
    return;
  }

  await interaction.editReply({
    content: `Here's your trial code: ${trialCode}`
  });
}

async function handleViewKeys(interaction) {
  const unusedCodes = trialManager.getAllUnusedCodes();
  const chunks = unusedCodes.reduce((acc, code, i) => {
    const chunkIndex = Math.floor(i / 10);
    if (!acc[chunkIndex]) acc[chunkIndex] = [];
    acc[chunkIndex].push(code);
    return acc;
  }, []);

  const embeds = chunks.map((chunk, i) => 
    new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Available Keys (Page ${i + 1}/${chunks.length})`)
      .setDescription(chunk.join('\n'))
  );

  await interaction.reply({ embeds, ephemeral: true });
}

async function handleAddKeyModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('add-key-modal')
    .setTitle('Add New Trial Key');

  const keyInput = new TextInputBuilder()
    .setCustomId('key-input')
    .setLabel('Enter the trial key')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('TRIAL-XXXX-XXXX-XXXX')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(keyInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleBulkAddModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('bulk-add-modal')
    .setTitle('Bulk Add Trial Keys');

  const keysInput = new TextInputBuilder()
    .setCustomId('keys-input')
    .setLabel('Enter keys (separated by commas or newlines)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('TRIAL-XXXX-XXXX-XXXX\nTRIAL-YYYY-YYYY-YYYY\nOr use commas to separate')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(keysInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleDeleteKeyModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('delete-key-modal')
    .setTitle('Delete Trial Key');

  const keyInput = new TextInputBuilder()
    .setCustomId('key-input')
    .setLabel('Enter the trial key to delete')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('TRIAL-XXXX-XXXX-XXXX')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(keyInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleViewUsedKeys(interaction) {
  const usedCodes = trialManager.getUsedCodes();
  const usedList = Object.entries(usedCodes).map(([userId, code]) => 
    `User: <@${userId}>\nCode: ${code}`
  );

  const chunks = usedList.reduce((acc, entry, i) => {
    const chunkIndex = Math.floor(i / 10);
    if (!acc[chunkIndex]) acc[chunkIndex] = [];
    acc[chunkIndex].push(entry);
    return acc;
  }, []);

  const embeds = chunks.map((chunk, i) => 
    new EmbedBuilder()
      .setColor('#FF5733')
      .setTitle(`Used Keys (Page ${i + 1}/${chunks.length})`)
      .setDescription(chunk.join('\n\n'))
  );

  await interaction.reply({ embeds, ephemeral: true });
}

async function handleAddKeySubmit(interaction) {
  const key = interaction.fields.getTextInputValue('key-input');
  const success = trialManager.addSingleCode(key);

  await interaction.reply({
    content: success ? `Successfully added key: ${key}` : 'Key already exists!',
    ephemeral: true
  });

  await updateManagementEmbed(interaction);
}

async function handleBulkAddSubmit(interaction) {
  const keysInput = interaction.fields.getTextInputValue('keys-input');
  // Split by both commas and newlines, then clean up the results
  const keys = keysInput
    .split(/[,\n]/)  // Split by comma or newline
    .map(key => key.trim())  // Remove whitespace
    .filter(key => key);  // Remove empty entries
  
  if (keys.length === 0) {
    await interaction.reply({
      content: 'No valid keys provided.',
      ephemeral: true
    });
    return;
  }

  trialManager.addTrialCodes(keys);
  
  await interaction.reply({
    content: `Successfully added ${keys.length} keys!`,
    ephemeral: true
  });

  await updateManagementEmbed(interaction);
}

async function handleDeleteKeySubmit(interaction) {
  const key = interaction.fields.getTextInputValue('key-input');
  const success = trialManager.deleteTrialCode(key);

  await interaction.reply({
    content: success ? `Successfully deleted key: ${key}` : 'Key not found!',
    ephemeral: true
  });

  await updateManagementEmbed(interaction);
}

async function updateManagementEmbed(interaction) {
  const channel = await interaction.client.channels.fetch(process.env.MANAGEMENT_CHANNEL_ID);
  if (channel) {
    const { embed, components } = createKeyManagementEmbed();
    await channel.send({ embeds: [embed], components });
  }
}