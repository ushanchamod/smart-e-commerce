export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

class AgentLogger {
  private minLevel: LogLevel;

  constructor() {
    this.minLevel =
      process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLog(level: string, message: string, data?: unknown): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (data instanceof Error) {
      entry.error = {
        message: data.message,
        stack: data.stack,
        name: data.name,
      };
    } else if (data && typeof data === "object") {
      entry.context = data as Record<string, unknown>;
    }

    return JSON.stringify(entry);
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatLog("DEBUG", message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog("INFO", message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog("WARN", message, data));
    }
  }

  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const logData = error ? { ...context, error } : context;
      console.error(this.formatLog("ERROR", message, logData));
    }
  }

  // Specialized logging methods
  agentStart(threadId: string, userId?: number): void {
    this.info("Agent execution started", { threadId, userId });
  }

  agentComplete(threadId: string, duration: number, llmCalls: number): void {
    this.info("Agent execution completed", {
      threadId,
      duration,
      llmCalls,
    });
  }

  agentError(
    threadId: string,
    error: unknown,
    context?: Record<string, unknown>
  ): void {
    this.error("Agent execution failed", error, { threadId, ...context });
  }

  toolCall(toolName: string, threadId: string, duration?: number): void {
    this.debug("Tool called", { toolName, threadId, duration });
  }

  toolError(toolName: string, threadId: string, error: unknown): void {
    this.error("Tool execution failed", error, { toolName, threadId });
  }

  rateLimitExceeded(identifier: string, type: string): void {
    this.warn("Rate limit exceeded", { identifier, type });
  }
}

export const logger = new AgentLogger();
