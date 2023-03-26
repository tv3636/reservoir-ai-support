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

async function getEmbeddingForText(text: string) {
  const { data: embed } = await openai.createEmbedding({
    input: text,
    model: model
  });

  return embed.data[0]['embedding'];
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

async function saveEmbeddingForMessage(message: any, messageFile: string, overrideText?: string) {
  let embedding = await getEmbeddingForText(overrideText ?? message.content);
  message.embedding = embedding;
  fs.writeFileSync(messageFile, JSON.stringify(message, null, 4));
  console.log(`Saved embedding for ${message.id}. \nText: ${overrideText ?? message.content}`);
}

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
    await saveEmbeddingForMessage(threadMessage, firstMessagePath, messages);
  };

  return [threadMessage, messages];
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

export async function getResponseForQuery(query: string) {
  if (enc.encode(query).length <= MAX_TOKENS) {
    let queryEmbedding = await getEmbeddingForText(query);

    // create a string of the top 3 docs
    let docString = "";
    (await getBestMatchingDocs(queryEmbedding)).slice(0, 3).map((result) => {
      console.log(result);
      docString += JSON.parse(fs.readFileSync(`docs/${result.file}`, 'utf8')).doc.body + "\n";
    });  

    let messageString = "";
    (await getBestMatchingMessages(queryEmbedding)).slice(0,15).map(async (result) => {
      console.log(result);
      let path = result.file.split('/');      
      let [thread, threadText] = await getThreadForMessage(path[1], path[2], false);
      messageString += threadText + "\n";

      console.log(threadText);
    });

    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {"role": "system", "content": "You are a friendly and helpful user support agent for the Reservoir API. You use the Reservoir API docs to answer user questions."},
        {"role": "user", "content": "Here are some relevant docs to help answer user questions: \n" + docString},
        {"role": "user", "content": "You can also use the following support chat history to help answer the question: \n" + messageString},
        {"role": "user", "content": "The user's question is: " + query}
      ]
    })

    console.log(completion.data.choices[0].message);
  }
}

