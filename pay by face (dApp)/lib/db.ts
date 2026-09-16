import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (process.env.NODE_ENV !== "production") {
  // Node's default CA bundle doesn't trust Neon's intermediate cert in dev.
  // Subclassing ws and passing rejectUnauthorized: false satisfies the
  // WebSocketConstructor type that neonConfig.webSocketConstructor expects.
  class DevWs extends ws {
    constructor(url: string) {
      super(url, { rejectUnauthorized: false } as ws.ClientOptions);
    }
  }
  neonConfig.webSocketConstructor = DevWs;
}
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaNeon({ connectionString });

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const prismaClient = new PrismaClient({ adapter });

export const db = globalThis.prismaGlobal || prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}
