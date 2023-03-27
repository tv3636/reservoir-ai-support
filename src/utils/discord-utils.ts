import discord, { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ThreadChannel } from 'discord.js';
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

export const saveMessageHistory = async (client: discord.Client) => {
  let guilds = await client.guilds.fetch();
  for (let guild of guilds) {
    let server = await client.guilds.fetch(guild[1].id);
    let channels = await server.channels.fetch();

    for (let channelId of ['926358989770473493', '1050437822915547156', '1050438658827759766']) {
      let channel = await server.channels.fetch(channelId);
      // Get message history for all text channels
      if (channel?.type == ChannelType.GuildText) {
        getMessageHistory(channel);

        // Get message history for all threads
        let threads = await channel.threads.fetch();
        for (let thread of threads.threads) {
          getMessageHistory(thread[1], channel);
        }
      }
    }
    
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
