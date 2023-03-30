import PgPromise from "pg-promise";
import dotenv from 'dotenv';
import { Doc } from "../sources/doc";
import { Api } from "../sources/api";

dotenv.config();

// TODO - try converting to use PrismaClient

export const pgp = PgPromise();
export const db = pgp({
  connectionString: process.env.DATABASE_URL,
  keepAlive: true,
  max: 60,
  connectionTimeoutMillis: 10000,
  query_timeout: 10000,
  statement_timeout: 10000,
  allowExitOnIdle: true,
});

export const logQuery = (query: string, values: any) => {
  console.log(PgPromise.as.format(query, values));
};

export const insertDoc = async (doc: Doc) => {
  const query = `
    INSERT INTO docs (id, embedding, title, body, updated_at)
    VALUES ($/slug/, $/embedding/, $/title/, $/body/, $/updated_at/)
    ON CONFLICT (id) DO UPDATE SET
      embedding = $/embedding/,
      title = $/title/,
      body = $/body/,
      updated_at = $/updated_at/      
  `;

  try {
    await db.none(query, doc);
  } catch (e) {
    console.log(`failed to insert doc for slug ${doc.slug}`, e);
  }

  console.log(`inserted doc for slug ${doc.slug}`);
};

export const insertApi = async (api: Api) => {
  const query = `
    INSERT INTO apis (id, embedding, name, spec, version)
    VALUES ($/path/, $/embedding/, $/name/, $/spec/, $/version/)
    ON CONFLICT (id) DO UPDATE SET
      embedding = $/embedding/,
      name = $/name/,
      spec = $/spec/,
      version = $/version/      
  `;

  try {
    await db.none(query, api);
  } catch (e) {
    console.log(`failed to insert api for path ${api.path}`, e);
  }

  console.log(`inserted api for path ${api.path}`);
}
