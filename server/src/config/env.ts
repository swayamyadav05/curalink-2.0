import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_MAX_RETRIES: z.coerce.number().int().min(1).default(5),
  MONGODB_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .min(100)
    .default(2000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map(
      (issue) => `${issue.path.join(".") || "env"}: ${issue.message}`,
    )
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsedEnv.data;
export type Env = typeof env;
