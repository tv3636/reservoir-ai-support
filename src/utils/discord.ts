import discord, {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ThreadChannel,
} from "discord.js";

export const ASK_AI_BUTTON = "Ask Reservoir AI";
export const YES = "Yes";
export const NO = "No";

// Returns true if the message started a new thread
export const newThread = (message: discord.Message) => {
  return (
    message.channel.isThread() && message.channel.messageCount && message.channel.messageCount == 2
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
    title: "Did this answer your question?",
    footer: "If not, a human will get back to you shortly.",
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

  if (!response || response == YES) {
    actionBuilder.addComponents(
      new ButtonBuilder()
        .setCustomId(YES)
        .setLabel(YES)
        .setStyle(ButtonStyle.Success)
        .setDisabled(response != undefined)
    );
  }

  if (!response || response == NO) {
    actionBuilder.addComponents(
      new ButtonBuilder()
        .setCustomId(NO)
        .setLabel(NO)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(response != undefined)
    );
  }

  return actionBuilder;
};
