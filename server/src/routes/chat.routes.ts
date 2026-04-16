import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import { Conversation, Message, User } from "../models";
import { callAIResearch } from "../services/ai.service";
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

    const userMessage = await Message.create({
      conversationId: conversation._id,
      role: "user",
      content: payload.message,
    });

    const recentMessages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select({ role: 1, content: 1 })
      .lean();

    const conversationHistory = recentMessages
      .reverse()
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const disease = payload.disease ?? conversation.context?.disease;
    const location =
      payload.location ?? conversation.context?.location;

    let assistantMessage;

    try {
      const aiResponse = await callAIResearch({
        query: payload.message,
        disease,
        location,
        conversationHistory,
      });

      assistantMessage = await Message.create({
        conversationId: conversation._id,
        role: "assistant",
        content:
          aiResponse.structured.overview ||
          "No overview available from research service.",
        structured: {
          overview: aiResponse.structured.overview,
          insights: aiResponse.structured.insights,
          trialSummary: aiResponse.structured.trialSummary,
        },
        publications: aiResponse.publications.map((publication) => ({
          title: publication.title,
          authors: publication.authors,
          year: publication.year,
          source: publication.source,
          url: publication.url,
          abstract: publication.abstract,
          relevanceScore: publication.relevanceScore,
        })),
        clinicalTrials: aiResponse.clinicalTrials.map((trial) => ({
          title: trial.title,
          status: trial.status,
          eligibility: trial.eligibility,
          location: trial.location,
          contact: trial.contact,
          url: trial.url,
        })),
      });
    } catch (_error) {
      assistantMessage = await Message.create({
        conversationId: conversation._id,
        role: "assistant",
        content:
          "I'm having trouble connecting to the research service. Please try again.",
        publications: [],
        clinicalTrials: [],
      });
    }

    conversation.context = {
      ...conversation.context,
      disease: payload.disease ?? conversation.context?.disease,
      location: payload.location ?? conversation.context?.location,
      topics: [
        ...(conversation.context?.topics ?? []),
        payload.message,
      ],
    };

    await conversation.save();

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
