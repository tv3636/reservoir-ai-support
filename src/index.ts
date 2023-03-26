import discord, { ChannelType, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { getMessageHistory } from './utils/discord-utils';
import { addEmbeddingToDocs } from './utils/embedding';

dotenv.config();

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('No bot token found!');
}

const client = new discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  let guilds = await client.guilds.fetch();
  for (let guild of guilds) {
    let server = await client.guilds.fetch(guild[1].id);
    let channels = await server.channels.fetch();
    
    for (let channel of channels) {
      // Get message history for all text channels
      if (channel[1]?.type == ChannelType.GuildText) {
        getMessageHistory(channel[1]);

        // Get message history for all threads
        let threads = await channel[1].threads.fetch();
        for (let thread of threads.threads) {
          getMessageHistory(thread[1], channel[1]);
        }
      }
    }
  }

  //addEmbeddingToDocs();
});

client.on('messageCreate', (message: any) => {
  if (message.author.bot) return;
  
  console.log('message:', message);
});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
