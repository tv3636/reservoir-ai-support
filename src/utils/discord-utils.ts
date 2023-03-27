import discord, { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ThreadChannel } from 'discord.js';
import fs from 'fs';

export const saveMessage = async (message: discord.Message, parentChannel?: discord.BaseGuildTextChannel) => {
  let directory = `messages/${parentChannel ? `${parentChannel.id}/` : ''}${message.channel.id}`;
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }

  fs.writeFileSync(
    `${directory}/${message.id}.json`, 
    JSON.stringify(message, null, 4)
  );
}

export const getMessageHistory = async (channel: discord.AnyThreadChannel | discord.BaseGuildTextChannel, parentChannel?: discord.BaseGuildTextChannel) => {
  let message = await channel.messages
    .fetch({ limit: 1 })
    .then(messagePage => {
      messagePage.forEach(msg => saveMessage(msg, parentChannel));
      return messagePage.size === 1 ? messagePage.at(0) : null;
    });

  while (message) {
    await channel.messages
      .fetch({ limit: 100, before: message.id })
      .then(messagePage => {
        messagePage.forEach(msg => saveMessage(msg, parentChannel));
        message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
      })
  }
}

export const newThread = (message: discord.Message) => {
  return message.channel.isThread() && message.channel.messageCount && message.channel.messageCount == 2;
}

export const getButton = (enabled: boolean) => {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('primary')
        .setLabel('Ask Reservoir AI')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!enabled)
    );
}

export const userOptIn = async (channel: ThreadChannel) => {
  const embed = new EmbedBuilder()
    .setTitle('Ask Reservoir\'s experimental AI Intern?')
    .setFooter({ text: 'Please note that this is an experimental feature and the accuracy of responses cannot be guaranteed.'});

  await channel.send({ 
    embeds: [embed], 
    components: [getButton(true)] 
  });
}
