import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "drizzle-kit";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"]!,
  },
} satisfies Config;
