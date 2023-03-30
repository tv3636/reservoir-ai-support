import { DOCS_BASE_URL, headers, slugs } from "../constants";
import { insertDoc } from "../utils/db-utils";
import { getEmbeddingForText } from "../utils/openai-utils";

export interface Doc {
  slug: string;
  embedding: number[];
  title: string;
  body: string;
  updated_at: string;
}

// Get all docs and insert with embeddings into db
export async function getDocs() {
  for (const slug of slugs) {
    try {
      headers.Referer = DOCS_BASE_URL + slug;
      let response = await fetch(DOCS_BASE_URL + slug + "?json=on", {"headers": headers});
      let doc = await response.json();

      doc.embedding = await getEmbeddingForText(`${doc.doc.title}\n${doc.doc.body}`);      
      
      insertDoc(
        {
          slug: slug,
          embedding: doc.embedding,
          title: doc.doc.title,
          body: doc.doc.body,
          updated_at: doc.doc.updatedAt
        }
      );
    } catch (e) {
      console.log(`failed to load doc for slug ${slug}`, e);
    }
  }
}
