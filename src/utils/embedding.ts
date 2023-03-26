import { Configuration, OpenAIApi } from "openai";
import { encoding_for_model } from "@dqbd/tiktoken";
import dotenv from 'dotenv';
import fs from 'fs';

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

