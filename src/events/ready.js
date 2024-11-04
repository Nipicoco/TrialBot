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
        } catch (error) {
          console.error('Failed to fetch trial message, creating new one:', error.message);
          const { embed, row } = createTrialEmbed();
          const message = await trialChannel.send({ 
            embeds: [embed],
            components: [row]
          });
          updateEnvFile({ TRIAL_MESSAGE_ID: message.id });
        }
      } else {
        const { embed, row } = createTrialEmbed();
        const message = await trialChannel.send({ 
          embeds: [embed],
          components: [row]
        });
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
        } catch (error) {
          console.error('Failed to fetch management message, creating new one:', error.message);
          const { embed, components } = createKeyManagementEmbed();
          const message = await managementChannel.send({
            embeds: [embed],
            components
          });
          updateEnvFile({ MANAGEMENT_MESSAGE_ID: message.id });
        }
      } else {
        const { embed, components } = createKeyManagementEmbed();
        const message = await managementChannel.send({
          embeds: [embed],
          components
        });
        updateEnvFile({ MANAGEMENT_MESSAGE_ID: message.id });
      }
    }
  }
}; 