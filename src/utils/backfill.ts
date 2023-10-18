import { insertMessage } from "./db";
import { Configuration, OpenAIApi } from "openai";
import discord from "discord.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const model = "text-embedding-ada-002";

async function getEmbeddingForText(text: string) {
  const { data: embed } = await openai.createEmbedding({
    input: text,
    model: model,
  });

  return embed.data[0]["embedding"];
}

export const fetchAllMessages = async (thread: discord.AnyThreadChannel) => {
  let messages: discord.Message[] = [];

  let message = await thread.messages.fetch({ limit: 1 }).then((messagePage) => {
    messagePage.forEach((msg) => messages.push(msg));
    return messagePage.size === 1 ? messagePage.at(0) : null;
  });

  while (message) {
    await thread.messages.fetch({ limit: 100, before: message.id }).then((messagePage) => {
      messagePage.forEach((msg) => messages.push(msg));
      message = messagePage.size > 0 ? messagePage.at(messagePage.size - 1) : null;
    });
  }

  return messages;
};

export const getThreadText = async (thread: discord.AnyThreadChannel, authorOnly?: boolean) => {
  const threadMessages = await fetchAllMessages(thread);
  const op = await thread.fetchStarterMessage();
  if (!op) return;

  let threadText = op.content;

  threadMessages.forEach((msg) => {
    if (authorOnly && msg.author.id != op?.author.id) return;
    threadText += `\n${msg.content}`;
  });

  return threadText;
};

/* 
export const getThread = async (thread: discord.AnyThreadChannel) => {
  let threadMessages = await fetchAllMessages(thread);

  if (threadMessages.length > 0) {
    const threadId = threadMessages[0].channelId;

    try {
      let op = await thread.fetchStarterMessage();

      if (op) {
        const threadText = await getThreadText(thread);
        const embedding = await getEmbeddingForText(threadText);

        await insertMessage({
          id: op.id,
          embedding,
          text: op.id == threadId ? threadText : op.content,
          timestamp: new Date(op.createdTimestamp),
          author_id: op.author.id,
          thread_id: op.id == threadId ? undefined : threadId,
        });
      }
    } catch (e) {
      console.log(`failed to load thread ${threadId}`, e);
    }
  }
};

// Get all messages and insert with embeddings into db
export const getMessages = async (client: discord.Client) => {
  let guilds = await client.guilds.fetch();

  for (let guild of guilds) {
    let server = await client.guilds.fetch(guild[1].id);

    for (let channelId of ["926358989770473493", "1050437822915547156", "1050438658827759766"]) {
      let channel = await server.channels.fetch(channelId);

      if (channel?.type == discord.ChannelType.GuildText) {
        // Get message history for all threads
        let threads = await channel.threads.fetch();
        for (let thread of threads.threads) {
          getThread(thread[1]);
        }
      }
    }
  }
};
*/
