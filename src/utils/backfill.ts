import { API_DOCS_BASE_URL, DOCS_BASE_URL, headers, slugs } from "../constants";
import { insertApi, insertDoc, insertMessage } from "./db";
import { getEmbeddingForText } from "./openai";
import discord from "discord.js";

const fetchAllMessages = async (thread: discord.AnyThreadChannel) => {
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

export const getThread = async (
  thread: discord.AnyThreadChannel,
  parentChannel: discord.TextBasedChannel
) => {
  let threadMessages = await fetchAllMessages(thread);

  if (threadMessages.length > 0) {
    let threadText = "";
    const threadId = threadMessages[0].channelId;

    try {
      let op = await parentChannel.messages.fetch(threadId);
      threadMessages.unshift(op);
      threadMessages.forEach((msg) => (threadText += `${msg.content}\n`));
      const embedding = await getEmbeddingForText(threadText);

      await insertMessage({
        id: op.id,
        embedding,
        text: op.id == threadId ? threadText : op.content,
        timestamp: new Date(op.createdTimestamp),
        author_id: op.author.id,
        thread_id: op.id == threadId ? undefined : threadId,
      });
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
          getThread(thread[1], channel);
        }
      }
    }
  }
};

// Get all docs and insert with embeddings into db
export async function getDocs() {
  for (const slug of slugs) {
    try {
      headers.Referer = DOCS_BASE_URL + slug;
      let response = await fetch(DOCS_BASE_URL + slug + "?json=on", { headers: headers });
      let doc = await response.json();

      doc.embedding = await getEmbeddingForText(`${doc.doc.title}\n${doc.doc.body}`);

      insertDoc({
        slug: slug,
        embedding: doc.embedding,
        title: doc.doc.title,
        body: doc.doc.body,
        updated_at: doc.doc.updatedAt,
      });
    } catch (e) {
      console.log(`failed to load doc for slug ${slug}`, e);
    }
  }
}

// Get all apis and insert with embeddings into db
export async function getApis() {
  try {
    headers.Referer = API_DOCS_BASE_URL;
    let slug = `getactivityv5`; // we get full API specs from a single endpoint
    let response = await fetch(API_DOCS_BASE_URL + slug + "?json=on", { headers: headers });
    let api = (await response.json()).oasDefinition.paths;

    for (var path of Object.keys(api)) {
      if (!path.startsWith("/admin")) {
        let embedding = await getEmbeddingForText(JSON.stringify(api[path], null, 4));
        let version = Number(path.slice(path.lastIndexOf("/") + 2)) || 0;

        await insertApi({
          path,
          embedding,
          name: api[path].get ? api[path].get.operationId : api[path].post?.operationId ?? path,
          spec: api[path],
          version,
        });
      }
    }
  } catch (e) {
    console.log(`failed to load api`, e);
  }
}
