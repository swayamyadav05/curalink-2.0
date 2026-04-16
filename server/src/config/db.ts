import mongoose from "mongoose";

import { env } from "./env";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const connectToDatabase = async (): Promise<void> => {
  const { MONGODB_MAX_RETRIES, MONGODB_RETRY_DELAY_MS, MONGODB_URI } =
    env;

  for (
    let attempt = 1;
    attempt <= MONGODB_MAX_RETRIES;
    attempt += 1
  ) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });

      console.log("MongoDB connected successfully");
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      const lastAttempt = attempt === MONGODB_MAX_RETRIES;

      if (lastAttempt) {
        throw new Error(
          `MongoDB connection failed after ${attempt} attempts: ${message}`,
        );
      }

      console.warn(
        `MongoDB attempt ${attempt}/${MONGODB_MAX_RETRIES} failed: ${message}. Retrying in ${MONGODB_RETRY_DELAY_MS}ms...`,
      );

      await sleep(MONGODB_RETRY_DELAY_MS);
    }
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
};
