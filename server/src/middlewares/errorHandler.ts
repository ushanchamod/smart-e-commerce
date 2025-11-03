import { Request, Response } from "express";

// Define AppError class
export class AppError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Parse Postgres errors
function parsePgError(err: unknown) {
  if (!(err instanceof Error && "code" in err)) return null;

  const code = err.code as string;
  const detail = "detail" in err ? err.detail : undefined;

  switch (code) {
    case "23505": // unique_violation
      return {
        status: 409,
        message: "Duplicate value violates unique constraint",
        details: process.env.NODE_ENV === "production" ? undefined : detail,
      };
    case "23503": // foreign_key_violation
      return {
        status: 400,
        message: "Invalid reference to related resource",
        details: process.env.NODE_ENV === "production" ? undefined : detail,
      };
    case "23502": // not_null_violation
      return {
        status: 400,
        message: "Required field is missing",
        details:
          process.env.NODE_ENV === "production"
            ? undefined
            : "column" in err
              ? err.column
              : undefined,
      };
    case "22P02": // invalid_text_representation
      return {
        status: 400,
        message: "Invalid input format",
        details:
          process.env.NODE_ENV === "production" ? undefined : err.message,
      };
    case "ECONNREFUSED": // Connection error
      return {
        status: 503,
        message: "Database connection unavailable",
        details: undefined,
      };
    default:
      return {
        status: 500,
        message: "Database error occurred",
        details:
          process.env.NODE_ENV === "production" ? undefined : err.message,
      };
  }
}

export const errorHandler = (err: unknown, req: Request, res: Response) => {
  let customError = {
    status: 500,
    message: "Something went wrong",
    details: process.env.NODE_ENV === "production" ? undefined : err,
  };
  res.status(customError.status).json(customError);
};
