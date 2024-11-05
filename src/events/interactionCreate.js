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
          case 'wipe-keys':
            await handleWipeKeys(interaction);
            break;
          case 'second-chance':
            await handleSecondChanceModal(interaction);
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
          case 'wipe-keys-confirm':
            await handleWipeKeysConfirm(interaction);
            break;
          case 'second-chance-modal':
            await handleSecondChanceSubmit(interaction);
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

  const existingTrials = trialManager.getUserTrials(userId);
  const hasSecondChance = trialManager.hasSecondChance(userId);

  if (existingTrials.length > 0) {
    if (existingTrials.length === 2 || (existingTrials.length === 1 && !hasSecondChance)) {
      await interaction.editReply({
        content: `You've already used your trial codes:\n${existingTrials.join('\n')}`
      });
      return;
    }
  }

  const trialCode = trialManager.getTrialCode(userId);
  
  if (!trialCode) {
    await interaction.editReply({
      content: 'Sorry, there are no trial codes available at the moment.'
    });
    return;
  }

  await interaction.editReply({
    content: `Here's your trial code: ${trialCode}\n${existingTrials.length === 1 ? '(Second Chance Code)' : ''}`
  });

  await updateManagementEmbed(interaction);
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
  await updateManagementEmbed(interaction);
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
  await updateManagementEmbed(interaction);
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
  const keys = keysInput
    .split(/[,\n]/)
    .map(key => key.trim())
    .filter(key => key);
  
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
  const managementChannel = await interaction.client.channels.fetch(process.env.MANAGEMENT_CHANNEL_ID);
  if (managementChannel && process.env.MANAGEMENT_MESSAGE_ID) {
    try {
      const managementMessage = await managementChannel.messages.fetch(process.env.MANAGEMENT_MESSAGE_ID);
      const { embed, components } = createKeyManagementEmbed();
      await managementMessage.edit({
        embeds: [embed],
        components
      });
    } catch (error) {
      console.error('Failed to update management embed:', error);
    }
  }
}

async function handleWipeKeys(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('wipe-keys-confirm')
    .setTitle('Confirm Wipe All Keys');

  const confirmInput = new TextInputBuilder()
    .setCustomId('confirm-input')
    .setLabel('Type "CONFIRM" to wipe all unused keys')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('CONFIRM')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(confirmInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleWipeKeysConfirm(interaction) {
  const confirmation = interaction.fields.getTextInputValue('confirm-input');
  
  if (confirmation !== 'CONFIRM') {
    await interaction.reply({
      content: 'Operation cancelled - confirmation text did not match.',
      ephemeral: true
    });
    return;
  }

  const count = trialManager.wipeUnusedKeys();
  
  await interaction.reply({
    content: `Successfully wiped ${count} unused keys!`,
    ephemeral: true
  });

  await updateManagementEmbed(interaction);
}

async function handleSecondChanceModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('second-chance-modal')
    .setTitle('Give Second Chance');

  const userInput = new TextInputBuilder()
    .setCustomId('user-input')
    .setLabel('Enter Discord User ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('123456789012345678')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(userInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleSecondChanceSubmit(interaction) {
  const userId = interaction.fields.getTextInputValue('user-input');
  const success = trialManager.addSecondChance(userId);

  await interaction.reply({
    content: success ? 
      `Successfully gave second chance to <@${userId}>` : 
      'User already has a second chance!',
    ephemeral: true
  });

  await updateManagementEmbed(interaction);
}