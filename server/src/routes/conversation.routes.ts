import { Router } from "express";
import { Types } from "mongoose";

import { Conversation, Message } from "../models";
import { ApiError } from "../utils/ApiError";
import { okResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const conversationRouter = Router();

conversationRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const userId = String(req.params.userId ?? "");

    if (!Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user id");
    }

    const conversations = await Conversation.find({ userId }).sort({
      updatedAt: -1,
    });

    return res
      .status(200)
      .json(
        okResponse(
          conversations,
          "Conversations fetched successfully",
        ),
      );
  }),
);

conversationRouter.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id ?? "");

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid conversation id");
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const messages = await Message.find({ conversationId: id });

    return res
      .status(200)
      .json(okResponse(messages, "Messages fetched successfully"));
  }),
);

conversationRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id ?? "");

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid conversation id");
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const deleteMessagesResult = await Message.deleteMany({
      conversationId: id,
    });
    await Conversation.deleteOne({ _id: id });

    return res.status(200).json(
      okResponse(
        {
          conversationId: id,
          deletedMessageCount: deleteMessagesResult.deletedCount ?? 0,
        },
        "Conversation deleted successfully",
      ),
    );
  }),
);

export { conversationRouter };
