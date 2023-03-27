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
  
  // TODO - move to background jobs
  //saveMessageHistory();;
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
      // TODO - disable button after click
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
