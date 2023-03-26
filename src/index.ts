import discord, { ChannelType, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { getMessageHistory } from './utils/discord-utils';
import { addEmbeddingToDocs, addEmbeddingToMessages, getResponseForQuery } from './utils/openai-utils';

dotenv.config();

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('No bot token found!');
}

const client = new discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  /*
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
  */

  //addEmbeddingToDocs();
  //addEmbeddingToMessages();
});

client.on('messageCreate', async (message: any) => {
  if (message.author.bot) return;

  
  console.log(message.content);
  if (message.content.startsWith('!reservoir')) { 
    console.log('hello');
    await getResponseForQuery(message.content.slice(11));
  }
  
});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
