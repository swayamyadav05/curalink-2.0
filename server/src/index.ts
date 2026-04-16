import http from "node:http";

import { app } from "./app";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "./config/db";
import { env } from "./config/env";

const startServer = async (): Promise<void> => {
  try {
    await connectToDatabase();

    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      console.log(`Server listening on http://localhost:${env.PORT}`);
    });

    const gracefulShutdown = (signal: NodeJS.Signals): void => {
      console.log(`Received ${signal}. Shutting down...`);

      server.close(async () => {
        try {
          await disconnectFromDatabase();
          console.log("Server shut down successfully");
          process.exit(0);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(`Shutdown error: ${message}`);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`Failed to start server: ${message}`);
    process.exit(1);
  }
};

void startServer();
