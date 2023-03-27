import discord, { ChannelType, Events, GatewayIntentBits, Partials, ThreadChannel } from 'discord.js';
import dotenv from 'dotenv';
import { getButton, getMessageHistory, newThread, userOptIn } from './utils/discord-utils';
import { addEmbeddingtoAPI, addEmbeddingToDocs, addEmbeddingToMessages, getResponseForQuery } from './utils/openai-utils';

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
  //addEmbeddingtoAPI();
});

client.on('messageCreate', async (message: discord.Message) => {
  if (message.author.bot) return;
    
  if (newThread(message)) { 
    userOptIn(message.channel as ThreadChannel);
  }
  
});

// Button click
client.on(Events.InteractionCreate, async (interaction: discord.Interaction) => {
	if (!interaction.isButton()) return;
  
  try {
    const op = await (interaction.channel as ThreadChannel).fetchStarterMessage();  
    if (op && interaction.channel) {            
      await interaction.deferReply();
      //await interaction.update({ components: [getButton(false)] });
      let response = await getResponseForQuery(op.content);
      await interaction.editReply({ content: response?.content });  
    }  
  } catch (e) {
    console.log(e);
  } 

});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
