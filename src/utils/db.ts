import dotenv from "dotenv";
import { Message } from "../types";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

dotenv.config();

export const insertMessage = async (message: Message) => {
  try {
    await prisma.messages.upsert({
      create: {
        id: message.id,
        embedding: message.embedding,
        text: message.text,
        date: message.timestamp,
        author_id: message.author_id,
        thread_id: message.thread_id,
      },
      update: {
        embedding: message.embedding,
        text: message.text,
        date: message.timestamp,
        author_id: message.author_id,
        thread_id: message.thread_id,
      },
      where: { id: message.id },
    });

    console.log(`inserted message for id ${message.id}`);
  } catch (e) {
    console.log(`failed to insert message for id ${message.id}`, e);
  }
};
