/**
 * Input validation and sanitization for chat messages
 */

const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 1;

/**
 * Validate and sanitize user message
 */
export function validateMessage(message: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (!message || typeof message !== "string") {
    return {
      valid: false,
      error: "Message must be a non-empty string",
    };
  }

  // Trim whitespace
  const trimmed = message.trim();

  // Check length
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: "Message cannot be empty",
    };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }

  // Basic sanitization (remove control characters except newlines and tabs)
  const sanitized = trimmed.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  // Check for potential injection patterns (basic check)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return {
        valid: false,
        error: "Message contains potentially unsafe content",
      };
    }
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Validate thread/session ID
 */
export function validateThreadId(threadId: string): boolean {
  if (!threadId || typeof threadId !== "string") {
    return false;
  }

  // UUID format or socket ID format
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const socketIdPattern = /^[a-zA-Z0-9_-]+$/;

  return uuidPattern.test(threadId) || socketIdPattern.test(threadId);
}

