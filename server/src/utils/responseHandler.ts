import { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = "Success",
  statusCode = 200
) => {
  res.status(statusCode).json({
    status: "success",
    message,
    content: data,
  });
};

export const sendError = (
  res: Response,
  errorMessage = "Error",
  statusCode = 500,
  error: unknown = null
) => {
  console.error(errorMessage, error);
  res.status(statusCode).json({
    status: "error",
    message: errorMessage,
    error,
  });
};
