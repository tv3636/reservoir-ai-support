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

async function saveEmbeddingForMessage(message: any, messageFile: string) {
  let embedding = await getEmbeddingForText(message.content);
  message.embedding = embedding;
  fs.writeFileSync(messageFile, JSON.stringify(message, null, 4));
  console.log(`Saved embedding for ${message.id}`);
}

export async function addEmbeddingToMessages() {
  for (const file of fs.readdirSync('messages')) {
    for (const channelFile of fs.readdirSync(`messages/${file}`)) {
      if (fs.lstatSync(`messages/${file}/${channelFile}`).isDirectory()) {
        for (const threadFile of fs.readdirSync(`messages/${file}/${channelFile}`)) {
          let message = JSON.parse(
            fs.readFileSync(`messages/${file}/${channelFile}/${threadFile}`, 'utf8')
          );

          await saveEmbeddingForMessage(message, `messages/${file}/${channelFile}/${threadFile}`);
        }
      } else {
        let message = JSON.parse(
          fs.readFileSync(`messages/${file}/${channelFile}`, 'utf8')
        );
        
        await saveEmbeddingForMessage(message, `messages/${file}/${channelFile}`);
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
  for (const file of fs.readdirSync('messages')) {
    for (const channelFile of fs.readdirSync(`messages/${file}`)) {
      if (fs.lstatSync(`messages/${file}/${channelFile}`).isDirectory()) {
        for (const threadFile of fs.readdirSync(`messages/${file}/${channelFile}`)) {
          let fullPath = `messages/${file}/${channelFile}/${threadFile}`;
          let message = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

          results[fullPath] = similarity(queryEmbedding, message.embedding);
        }
      } else {
        let fullPath = `messages/${file}/${channelFile}`;
        let message = JSON.parse(
          fs.readFileSync(fullPath, 'utf8')
        );

        results[fullPath] = similarity(queryEmbedding, message.embedding);
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

    // create a string of the top 5 docs
    let docString = "";
    (await getBestMatchingDocs(queryEmbedding)).slice(0, 5).map((result) => {
      console.log(result);
      docString += JSON.parse(fs.readFileSync(`docs/${result.file}`, 'utf8')).doc.body + "\n";
    });

    //console.log(docString);

    /*
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {"role": "system", "content": "You are a friendly and helpful user support agent for the Reservoir API. You use the Reservoir API docs to answer user questions."},
        {"role": "user", "content": "Here are some relevant docs to help answer user questions: \n" + docString},
        {"role": "user", "content": query}
      ]
    })

    console.log(completion.data.choices[0].message);

    */

    (await getBestMatchingMessages(queryEmbedding)).slice(0,100).map((result) => {
      console.log(result);
      console.log(JSON.parse(fs.readFileSync(result.file, 'utf8')).content);
    });
  }
}

