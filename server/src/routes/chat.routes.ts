import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import { Conversation, Message, User } from "../models";
import { ApiError } from "../utils/ApiError";
import { okResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const createChatSchema = z.object({
  userId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1),
  disease: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
});

const chatRouter = Router();

const generateConversationTitle = (message: string): string => {
  const sanitized = message.replace(/\s+/g, " ").trim();
  return sanitized.length > 60
    ? `${sanitized.slice(0, 60).trim()}...`
    : sanitized;
};

chatRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createChatSchema.parse(req.body);

    if (!Types.ObjectId.isValid(payload.userId)) {
      throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(payload.userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    let conversation;
    let wasConversationCreated = false;

    if (payload.conversationId) {
      if (!Types.ObjectId.isValid(payload.conversationId)) {
        throw new ApiError(400, "Invalid conversation id");
      }

      conversation = await Conversation.findById(
        payload.conversationId,
      );

      if (!conversation) {
        throw new ApiError(404, "Conversation not found");
      }

      if (conversation.userId.toString() !== payload.userId) {
        throw new ApiError(
          400,
          "Conversation does not belong to the provided user",
        );
      }
    } else {
      conversation = await Conversation.create({
        userId: payload.userId,
        title: generateConversationTitle(payload.message),
        context: {
          disease: payload.disease,
          location: payload.location,
          topics: [],
        },
      });
      wasConversationCreated = true;
    }

    if (payload.disease || payload.location) {
      conversation.context = {
        ...conversation.context,
        disease: payload.disease ?? conversation.context.disease,
        location: payload.location ?? conversation.context.location,
        topics: conversation.context.topics ?? [],
      };

      await conversation.save();
    }

    const userMessage = await Message.create({
      conversationId: conversation._id,
      role: "user",
      content: payload.message,
    });

    const assistantMessage = await Message.create({
      conversationId: conversation._id,
      role: "assistant",
      content:
        "This is a placeholder response. AI pipeline will be connected on Day 2.",
      structured: {
        overview: "...",
        insights: "...",
        trialSummary: "...",
      },
      publications: [],
      clinicalTrials: [],
    });

    return res.status(wasConversationCreated ? 201 : 200).json(
      okResponse(
        {
          conversationId: conversation._id,
          userMessage,
          assistantMessage,
        },
        "Chat processed successfully",
      ),
    );
  }),
);

export { chatRouter };
