import { API_DOCS_BASE_URL, headers } from "../constants";
import { insertApi } from "../utils/db-utils";
import { getEmbeddingForText } from "../utils/openai-utils";

export interface Api {
  path: string;
  embedding: number[];
  name: string;
  spec: any;
  version: number;
}

// Get all apis and insert with embeddings into db
export async function getApis() {
  try {
    headers.Referer = API_DOCS_BASE_URL;
    let slug = `getactivityv5`; // we get full API specs from a single endpoint
    let response = await fetch(API_DOCS_BASE_URL + slug + "?json=on", {"headers": headers});
    let api = (await response.json()).oasDefinition.paths;    

    for (var path of Object.keys(api)) {
      if (!path.startsWith('/admin')) {
        let embedding = await getEmbeddingForText(JSON.stringify(api[path], null, 4));
        let version = Number(path.slice(path.lastIndexOf('/') + 2)) || 0;
        
        await insertApi({
          path,
          embedding,
          name: api[path].get ? api[path].get.operationId : api[path].post?.operationId ?? path,
          spec: api[path],
          version
        });
      }
    }
         
  } catch (e) {
    console.log(`failed to load api`, e);
  }
}
