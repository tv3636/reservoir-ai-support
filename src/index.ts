import discord, {
  ButtonComponent,
  Events,
  GatewayIntentBits,
  Partials,
  ThreadChannel,
} from "discord.js";
import dotenv from "dotenv";
import { getThreadText } from "./utils/backfill";
import {
  getAskButton,
  getOptInEmbed,
  getFeedbackButtons,
  newThread,
  userOptIn,
  getFeedbackEmbed,
  ASK_AI_BUTTON,
  existingThread,
  WAIT_FOR_AGENT,
} from "./utils/discord";
import axios from "axios";

dotenv.config();

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error("No bot token found!");
}

const client = new discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on("messageCreate", async (message: discord.Message) => {
  if (message.author.id === client.user?.id) return;

  if (newThread(message)) {
    userOptIn(message.channel as ThreadChannel);
  } else if (existingThread(message)) {
    // Start bot thinking indicator

    const op = await (message.channel as ThreadChannel).fetchStarterMessage();

    if (op && op.thread && message.channel && message.author.id == op.author.id) {
      const threadMessages = await op.thread.messages.fetch();
      const botMessages = Array.from(
        threadMessages
          .filter((threadMessage) => threadMessage.author.id === client.user?.id)
          .values()
      );

      const botReply = botMessages[0].components?.[0]?.components?.[0]?.data
        ? botMessages[0].components[0].components[0].data
        : botMessages[1].components[0].components[0].data;

      if (
        (botReply.disabled && (botReply as ButtonComponent).label === WAIT_FOR_AGENT) ||
        (botReply as ButtonComponent).label === ASK_AI_BUTTON
      )
        return;

      message.channel.sendTyping();
      const typing = setInterval(() => message.channel.sendTyping(), 9000);

      // Get AI response and send reply
      const question = message.content;
      const threadHistory = await getThreadText(op.thread, true);
      const { data } = await axios.post(
        "https://reservoir-ai-api-production-ea91.up.railway.app/api/generate-response",
        { supportType: "discord", question, threadHistory },
        {
          headers: {
            "admin-api-key": process.env.ADMIN_API_KEY,
          },
        }
      );

      // Stop bot thinking indicator
      clearInterval(typing);

      const response = data?.response;
      const chunks = response.match(/[\s\S]{1,1999}/g) || [];

      // Send all chunks as new messages
      for (let i = 0; i < chunks.length; i++) {
        await (message.channel as discord.TextChannel).send({
          content: chunks[i],
          components: i === chunks.length - 1 ? [getFeedbackButtons()] : [],
          embeds: i === chunks.length - 1 ? [getFeedbackEmbed()] : [],
        });
      }
    }
  }
});

// Button click
client.on(Events.InteractionCreate, async (interaction: discord.Interaction) => {
  if (!interaction.isButton()) return;

  try {
    const op = await (interaction.channel as ThreadChannel).fetchStarterMessage();

    if (op && op.thread && interaction.channel && interaction.user.id == op.author.id) {
      if (interaction.customId == ASK_AI_BUTTON) {
        // Disable button to ask AI once clicked
        await interaction.channel.messages.fetch(interaction.message.id).then((message) => {
          message.edit({
            components: [getAskButton(false)],
            embeds: [getOptInEmbed()],
          });
        });

        // Show bot thinking indicator
        await interaction.deferReply();

        // Get AI response and send reply
        const question = await getThreadText(op.thread, true);
        const { data } = await axios.post(
          "https://reservoir-ai-api-production-ea91.up.railway.app/api/generate-response",
          { supportType: "discord", question, threadHistory: "" },
          {
            headers: {
              "admin-api-key": process.env.ADMIN_API_KEY,
            },
          }
        );

        await interaction.deleteReply();

        const response: string = data?.response;
        const chunks = response.match(/[\s\S]{1,1999}/g) || [];

        // Send all chunks as new messages
        for (let i = 0; i < chunks.length; i++) {
          await (interaction.channel as discord.TextChannel).send({
            content: chunks[i],
            components: i === chunks.length - 1 ? [getFeedbackButtons()] : [],
            embeds: i === chunks.length - 1 ? [getFeedbackEmbed()] : [],
          });
        }
      } else {
        // Update feedback buttons with user response
        await interaction.update({
          components: [getFeedbackButtons(interaction.customId)],
          embeds: [getFeedbackEmbed()],
        });
      }
    }
  } catch (e) {
    console.log(e);
  }
});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
