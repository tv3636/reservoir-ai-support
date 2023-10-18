import discord, {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ThreadChannel,
} from "discord.js";

export const ASK_AI_BUTTON = "Ask Reservoir AI";
export const WAIT_FOR_AGENT = "Wait for an agent";

// Returns true if the message started a new thread
export const newThread = (message: discord.Message) => {
  return (
    message.channel.isThread() && message.channel.messageCount && message.channel.messageCount == 2
  );
};

export const existingThread = (message: discord.Message) => {
  return (
    message.channel.isThread() && message.channel.messageCount && message.channel.messageCount > 2
  );
};

export const getEmbed = (embed: { title: string; footer: string }) => {
  return new EmbedBuilder().setTitle(embed.title).setFooter({ text: embed.footer });
};

export const getOptInEmbed = () => {
  return getEmbed({
    title: "Ask AI while you wait?",
    footer:
      "Please note that this is an experimental feature and the accuracy of responses cannot be guaranteed.",
  });
};

export const getFeedbackEmbed = () => {
  return getEmbed({
    title: "Need to ask another question?",
    footer:
      "Send another message to ask the AI again; otherwise, select the button below to wait for an agent.",
  });
};

export const userOptIn = async (channel: ThreadChannel) => {
  const embed = getOptInEmbed();

  await channel.send({
    embeds: [embed],
    components: [getAskButton(true)],
  });
};

export const getAskButton = (enabled: boolean) => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ASK_AI_BUTTON)
      .setLabel(ASK_AI_BUTTON)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!enabled)
  );
};

export const getFeedbackButtons = (response?: string) => {
  let actionBuilder = new ActionRowBuilder<ButtonBuilder>();

  if (!response || response == WAIT_FOR_AGENT) {
    actionBuilder.addComponents(
      new ButtonBuilder()
        .setCustomId(WAIT_FOR_AGENT)
        .setLabel(WAIT_FOR_AGENT)
        .setStyle(ButtonStyle.Success)
        .setDisabled(response != undefined)
    );
  }

  return actionBuilder;
};
