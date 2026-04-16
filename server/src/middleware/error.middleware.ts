import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { ApiError } from "../utils/ApiError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new ApiError(
      404,
      `Route not found: ${req.method} ${req.originalUrl}`,
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "ValidationError",
      details: error.issues,
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      details: error.details,
    });
  }

  const message =
    error instanceof Error ? error.message : "Internal server error";

  return res.status(500).json({
    success: false,
    error: message,
  });
};
