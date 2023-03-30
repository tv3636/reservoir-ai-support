import discord, { Events, GatewayIntentBits, Partials, ThreadChannel } from 'discord.js';
import dotenv from 'dotenv';
import { getButton, getOptInEmbed, getFeedbackButtons, getMessageHistory, newThread, userOptIn, getFeedbackEmbed, ASK_AI_BUTTON } from './utils/discord-utils';
import { addEmbeddingtoAPI, addEmbeddingToMessages, getResponseForQuery } from './utils/openai-utils';
import { getDocs } from './sources/doc';
import { getApis } from './sources/api';

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

  getApis();
  
  // TODO - move to background jobs
  //saveMessageHistory();;
  //addEmbeddingToDocs();
  //addEmbeddingToMessages();
  //addEmbeddingtoAPI();
});

client.on('messageCreate', async (message: discord.Message) => {
  if(message.author.id === client.user?.id) return;
    
  if (newThread(message)) { 
    userOptIn(message.channel as ThreadChannel);
  }
  
});

// Button click
client.on(Events.InteractionCreate, async (interaction: discord.Interaction) => {
	if (!interaction.isButton()) return;
  
  try {
    const op = await (interaction.channel as ThreadChannel).fetchStarterMessage();

    if (op && interaction.channel && interaction.user.id == op.author.id) {
      if (interaction.customId == ASK_AI_BUTTON) {    
        // Disable button to ask AI once clicked
        await interaction.channel.messages.fetch(interaction.message.id).then(message => {
          message.edit({ 
            components: [getButton(false)], 
            embeds: [getOptInEmbed()] 
          });
        });

        // Show bot thinking indicator
        await interaction.deferReply();

        // Get AI response and send reply
        let response = await getResponseForQuery(op.content);
        await interaction.editReply({ 
          content: response?.content, 
          components: [getFeedbackButtons()],
          embeds: [getFeedbackEmbed()]
        });

      } else {
        // Update feedback buttons with user response
        await interaction.update({
          components: [getFeedbackButtons(interaction.customId)],
          embeds: [getFeedbackEmbed()]
        })
      }
    }  
  } catch (e) {
    console.log(e);
  } 

});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
