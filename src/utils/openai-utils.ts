import { Configuration, OpenAIApi } from "openai";
import { encoding_for_model } from "@dqbd/tiktoken";
import dotenv from 'dotenv';
import fs from 'fs';
// @ts-ignore
import similarity from 'compute-cosine-similarity';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const model = 'text-embedding-ada-002';
const enc = encoding_for_model(model);
const MAX_TOKENS = 8191;

const SYSTEM_PROMPT = "You are a friendly and helpful user support agent on the Reservoir team. You use the Reservoir docs, API specs, and support history to answer user questions in Discord.";
const DOC_PROMPT = "Here are some relevant docs to help answer user questions: \n";
const MESSAGE_PROMPT = "The following support chat history may be relevant to help answer the question: \n";
const API_PROMPT = "You can also use the following API specs to help answer the question: \n";
const QUERY_PROMPT = "The user's question is: ";

async function getEmbeddingForText(text: string) {
  const { data: embed } = await openai.createEmbedding({
    input: text,
    model: model
  });

  return embed.data[0]['embedding'];
}

// Add Embeddings

export async function addEmbeddingtoAPI() {
  let api = JSON.parse(fs.readFileSync('api.json', 'utf8'));
  for (var apiPath of Object.keys(api)) {
    let embedding = await getEmbeddingForText(JSON.stringify(api[apiPath], null, 4));
    api[apiPath].embedding = embedding;
    console.log(`Saved embedding for ${apiPath}`);
  }
  fs.writeFileSync('api.json', JSON.stringify(api, null, 4));
}

export async function addEmbeddingToDocs() {
  for (const file of fs.readdirSync('docs')) {
    let doc = JSON.parse(
      fs.readFileSync(`docs/${file}`, 'utf8')
    );

    let embedding = await getEmbeddingForText(`${doc.doc.title}\n${doc.doc.body}`);    
    doc.embedding = embedding;
    
    fs.writeFileSync(`docs/${file}`, JSON.stringify(doc, null, 4));
    console.log(`Saved embedding for ${doc.doc.title}`);
  }
}

export async function addEmbeddingToMessages() {
  for (const channel_id of fs.readdirSync('messages')) {
    for (const message_id of fs.readdirSync(`messages/${channel_id}`)) {
      let path = `messages/${channel_id}/${message_id}`;
      if (fs.lstatSync(path).isDirectory() && fs.existsSync(`${path}.json`)) {
        await getThreadForMessage(channel_id, message_id, true);                
      }
    }
  }
}

// Get best matching content

export async function getBestMatchingDocs(queryEmbedding: any) {
  let results: any = {};
  for (const file of fs.readdirSync('docs')) {
    let doc = JSON.parse(
      fs.readFileSync(`docs/${file}`, 'utf8')
    );

    results[file] = similarity(queryEmbedding, doc.embedding);
  }

  return Object.keys(results).sort((a, b) => results[b] - results[a]).map(
    key => ({ file: key, similarity: results[key] })
  );
}

export async function getBestMatchingMessages(queryEmbedding: any) {
  let results: any = {};
  for (const channel_id of fs.readdirSync('messages')) {
    for (const message_id of fs.readdirSync(`messages/${channel_id}`)) {
      let path = `messages/${channel_id}/${message_id}`;
      if (fs.lstatSync(path).isDirectory() && fs.existsSync(`${path}.json`)) {
        let [thread, threadText] = await getThreadForMessage(channel_id, message_id, false);
        results[path] = similarity(queryEmbedding, thread.embedding);
      }
    }
  }

  return Object.keys(results).sort((a, b) => results[b] - results[a]).map(
    key => ({ file: key, similarity: results[key] })
  );
}

export async function getBestMatchingAPI(queryEmbedding: any) {
  let results: any = {};
  let api = JSON.parse(fs.readFileSync('api.json', 'utf8'));
  for (var apiPath of Object.keys(api)) {
    results[apiPath] = similarity(queryEmbedding, api[apiPath].embedding);
  }

  return Object.keys(results).sort((a, b) => results[b] - results[a]).map(
    key => ({ path: key, similarity: results[key] })
  );
}

// Get full thread text for given thread. Optionally add embedding to thread

async function getThreadForMessage(channelId: string, messageId: string, addEmbedding: boolean) {
  let messages = '';
  let firstMessagePath = `messages/${channelId}/${messageId}.json`;
  let threadMessage = JSON.parse(fs.readFileSync(firstMessagePath, 'utf8'));
  messages += threadMessage.content + "\n";

  for (const threadFile of fs.readdirSync(`messages/${channelId}/${messageId}`)) {          
    let message = JSON.parse(
      fs.readFileSync(`messages/${channelId}/${messageId}/${threadFile}`, 'utf8')
    );
    messages += message.content + "\n";         
  }

  if (addEmbedding) {
    let embedding = await getEmbeddingForText(messages ?? threadMessage.content);
    threadMessage.embedding = embedding;
    fs.writeFileSync(firstMessagePath, JSON.stringify(threadMessage, null, 4));
    console.log(`Saved embedding for ${threadMessage.id}. \nText: ${messages ?? threadMessage.content}`);
  };

  return [threadMessage, messages];
}

// Get text from matches

function getDocFromMatch(match: any) {
  if (match) {
    return JSON.parse(fs.readFileSync(`docs/${match.file}`, 'utf8')).doc.body + "\n"
  } 

  return '';
}

async function getMessageFromMatch(match: any) {
  if (match) {
    let [thread, threadText] = await getThreadForMessage(match.file.split('/')[1], match.file.split('/')[2], false);
    return threadText;
  }

  return '';
}

function getAPIFromMatch(match: any) {
  if (match) {
    let api = JSON.parse(fs.readFileSync('api.json', 'utf8'));
    return JSON.stringify(api[match.path], null, 4);
  }

  return '';
}

// Validate token length

function tokensValid(text: string, buffer: number) {
  return enc.encode(text + SYSTEM_PROMPT + DOC_PROMPT + MESSAGE_PROMPT + API_PROMPT).length <= MAX_TOKENS - buffer;
}

// Answer user question with best available resources

export async function getResponseForQuery(query: string) {
  if (enc.encode(query).length <= MAX_TOKENS) {
    let queryEmbedding = await getEmbeddingForText(query);

    let docs = await getBestMatchingDocs(queryEmbedding);
    let messages = await getBestMatchingMessages(queryEmbedding);
    let api = await getBestMatchingAPI(queryEmbedding);

    let docString = "";
    let messageString = "";
    let apiString = "";

    while (tokensValid(docString + messageString + apiString, 1000)) {
      let docResult = docs.shift();
      console.log(docResult);
      let nextDoc = getDocFromMatch(docResult);
      if (tokensValid(nextDoc + docString + messageString + apiString, 250)) {
        docString += nextDoc + "\n";
      }

      let messageResult = messages.shift();
      console.log(messageResult);
      let nextMessage = await getMessageFromMatch(messageResult);
      if (tokensValid(nextMessage + docString + messageString + apiString, 250)) {
        messageString += nextMessage + "\n";
      }

      let apiResult = api.shift();
      console.log(apiResult);
      let nextAPI = getAPIFromMatch(api.shift());
      if (tokensValid(nextAPI + docString + messageString + apiString, 250)) {
        apiString += nextAPI + "\n";
      }      
    }

    console.log(query);

    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": DOC_PROMPT + docString},
        {"role": "user", "content": MESSAGE_PROMPT + messageString},
        {"role": "user", "content": API_PROMPT + apiString},
        {"role": "user", "content": QUERY_PROMPT + query}
      ],
      temperature: 0.25,
    })

    console.log(completion.data.choices[0].message);
    return completion.data.choices[0].message;
  }
}

