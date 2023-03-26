import discord from 'discord.js';
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