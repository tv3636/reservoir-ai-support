import { Configuration, OpenAIApi } from "openai";
import { encoding_for_model } from "@dqbd/tiktoken";
import dotenv from "dotenv";
// @ts-ignore
import similarity from "compute-cosine-similarity";
import { resources } from "..";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const model = "text-embedding-ada-002";
const enc = encoding_for_model(model);
const MAX_TOKENS = 8191;

const SYSTEM_PROMPT =
  "You are a friendly and helpful user support agent on the Reservoir team. You use the Reservoir docs, API specs, and support history to answer user questions in Discord.";
const DOC_PROMPT = "Here are some relevant docs to help answer user questions: \n";
const MESSAGE_PROMPT =
  "The following support chat history may be relevant to help answer the question: \n";
const API_PROMPT = "You can also use the following API specs to help answer the question: \n";
const QUERY_PROMPT = "The user's question is: ";

const DOC = "docs";
const MESSAGE = "messages";
const API = "apis";

export async function getEmbeddingForText(text: string) {
  const { data: embed } = await openai.createEmbedding({
    input: text,
    model: model,
  });

  return embed.data[0]["embedding"];
}

export async function getBestMatchingResources(table: string, queryEmbedding: any) {
  let results: any = {};
  const content = resources[table];
  for (const item of content) {
    results[item.id] = {
      similarity: similarity(queryEmbedding, item.embedding),
      item: item,
    };
  }

  return Object.keys(results)
    .sort((a, b) => results[b].similarity - results[a].similarity)
    .map((key) => ({
      id: key,
      similarity: results[key].similarity,
      item: results[key].item,
    }));
}

function getResourceFromMatch(match: any, resourceType: string) {
  switch (resourceType) {
    case DOC:
      return match ? `${match.item.title}\n${match.item.body}` : "";
    case MESSAGE:
      return match ? match.item.content : "";
    case API:
      return match ? JSON.stringify(match.item.spec, null, 4) : "";
    default:
      return "";
  }
}

// Validate token length
function tokensValid(text: string, buffer: number) {
  return (
    enc.encode(text + SYSTEM_PROMPT + DOC_PROMPT + MESSAGE_PROMPT + API_PROMPT).length <=
    MAX_TOKENS - buffer
  );
}

// Answer user question with best available resources
export async function getResponseForQuery(query: string) {
  if (enc.encode(query).length <= MAX_TOKENS) {
    let queryEmbedding = await getEmbeddingForText(query);

    let docs = await getBestMatchingResources(DOC, queryEmbedding);
    let messages = await getBestMatchingResources(MESSAGE, queryEmbedding);
    let apis = await getBestMatchingResources(API, queryEmbedding);

    let docString = "";
    let messageString = "";
    let apiString = "";

    while (docs && messages && apis && tokensValid(docString + messageString + apiString, 1000)) {
      let docResult = docs.shift();
      console.log(docResult?.similarity, docResult?.item.id);
      let nextDoc = getResourceFromMatch(docResult, DOC);
      if (tokensValid(nextDoc + docString + messageString + apiString, 250)) {
        docString += nextDoc + "\n";
      }

      let messageResult = messages.shift();
      console.log(messageResult?.similarity, messageResult?.item.text);
      let nextMessage = await getResourceFromMatch(messageResult, MESSAGE);
      if (tokensValid(nextMessage + docString + messageString + apiString, 250)) {
        messageString += nextMessage + "\n";
      }

      let apiResult = apis.shift();
      console.log(apiResult?.similarity, apiResult?.id);
      let nextAPI = getResourceFromMatch(apiResult, API);
      if (tokensValid(nextAPI + docString + messageString + apiString, 250)) {
        apiString += nextAPI + "\n";
      }
    }

    console.log(query);

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: DOC_PROMPT + docString },
        { role: "user", content: MESSAGE_PROMPT + messageString },
        { role: "user", content: API_PROMPT + apiString },
        { role: "user", content: QUERY_PROMPT + query },
      ],
      temperature: 0.25,
    });

    console.log(completion.data.choices[0].message);
    return completion.data.choices[0].message;
  }
}
