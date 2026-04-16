import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware";
import { chatRouter } from "./routes/chat.routes";
import { conversationRouter } from "./routes/conversation.routes";
import { healthRouter } from "./routes/health.routes";
import { userRouter } from "./routes/user.routes";

const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRouter);
app.use("/api/users", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/conversations", conversationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
