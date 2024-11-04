import { Events } from 'discord.js';
import { createTrialEmbed } from '../utils/embedBuilder.js';
import { createKeyManagementEmbed } from '../utils/keyManagementEmbed.js';
import { updateEnvFile } from '../utils/envManager.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Update trial embed
    const trialChannel = await client.channels.fetch(process.env.TRIAL_CHANNEL_ID);
    if (trialChannel) {
      if (process.env.TRIAL_MESSAGE_ID) {
        try {
          const trialMessage = await trialChannel.messages.fetch(process.env.TRIAL_MESSAGE_ID);
          const { embed, row } = createTrialEmbed();
          await trialMessage.edit({ 
            embeds: [embed],
            components: [row]
          });
          console.log('Successfully updated trial message');
        } catch (error) {
          console.error('Failed to fetch trial message, creating new one:', error.message);
          const { embed, row } = createTrialEmbed();
          const message = await trialChannel.send({ 
            embeds: [embed],
            components: [row]
          });
          console.log(`New trial message ID: ${message.id}`);
          updateEnvFile({ TRIAL_MESSAGE_ID: message.id });
        }
      } else {
        console.log('No TRIAL_MESSAGE_ID in .env, creating new message');
        const { embed, row } = createTrialEmbed();
        const message = await trialChannel.send({ 
          embeds: [embed],
          components: [row]
        });
        console.log(`New trial message ID: ${message.id}`);
        updateEnvFile({ TRIAL_MESSAGE_ID: message.id });
      }
    }

    // Update management embed
    const managementChannel = await client.channels.fetch(process.env.MANAGEMENT_CHANNEL_ID);
    if (managementChannel) {
      if (process.env.MANAGEMENT_MESSAGE_ID) {
        try {
          const managementMessage = await managementChannel.messages.fetch(process.env.MANAGEMENT_MESSAGE_ID);
          const { embed, components } = createKeyManagementEmbed();
          await managementMessage.edit({
            embeds: [embed],
            components
          });
          console.log('Successfully updated management message');
        } catch (error) {
          console.error('Failed to fetch management message, creating new one:', error.message);
          const { embed, components } = createKeyManagementEmbed();
          const message = await managementChannel.send({
            embeds: [embed],
            components
          });
          console.log(`New management message ID: ${message.id}`);
          updateEnvFile({ MANAGEMENT_MESSAGE_ID: message.id });
        }
      } else {
        console.log('No MANAGEMENT_MESSAGE_ID in .env, creating new message');
        const { embed, components } = createKeyManagementEmbed();
        const message = await managementChannel.send({
          embeds: [embed],
          components
        });
        console.log(`New management message ID: ${message.id}`);
        updateEnvFile({ MANAGEMENT_MESSAGE_ID: message.id });
      }
    }
  }
}; 