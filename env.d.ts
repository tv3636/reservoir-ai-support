declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Required env variables
      DISCORD_BOT_TOKEN: string;
      DISCORD_CLIENT_ID: string;
    }
  }
}

export {};
