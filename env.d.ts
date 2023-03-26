declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Required env variables
      DISCORD_BOT_TOKEN: string;
      OPENAI_API_KEY: string;
    }
  }
}

export {};
