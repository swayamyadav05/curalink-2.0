import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import { User } from "../models";
import { ApiError } from "../utils/ApiError";
import { okResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const createUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    diseaseOfInterest: z.string().trim().min(1).max(200).optional(),
    location: z.string().trim().min(1).max(200).optional(),
    identifier: z.string().trim().optional(),
  })
  .refine(
    (input) =>
      Boolean(
        input.name || input.diseaseOfInterest || input.location,
      ),
    {
      message:
        "At least one of name, diseaseOfInterest, or location must be provided",
    },
  );

const userRouter = Router();

userRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createUserSchema.parse(req.body);

    // Day 1 behavior: simple create; identifier upsert flow will be added later.
    const user = await User.create({
      name: payload.name,
      diseaseOfInterest: payload.diseaseOfInterest,
      location: payload.location,
    });

    return res
      .status(201)
      .json(okResponse(user, "User created successfully"));
  }),
);

userRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id ?? "");

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(okResponse(user, "User fetched successfully"));
  }),
);

export { userRouter };
