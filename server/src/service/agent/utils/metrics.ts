interface Metrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  averageLlmCalls: number;
  toolCallCounts: Record<string, number>;
  lastResetTime: number;
}

class MetricsCollector {
  private metrics: Metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    averageLlmCalls: 0,
    toolCallCounts: {},
    lastResetTime: Date.now(),
  };

  private responseTimes: number[] = [];
  private llmCallCounts: number[] = [];
  private readonly maxSamples = 1000;

  recordRequest(
    responseTime: number,
    llmCalls: number,
    toolCalls?: string[],
    error?: boolean
  ): void {
    this.metrics.requestCount++;
    if (error) {
      this.metrics.errorCount++;
    }

    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxSamples) {
      this.responseTimes.shift();
    }
    this.metrics.averageResponseTime =
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

    this.llmCallCounts.push(llmCalls);
    if (this.llmCallCounts.length > this.maxSamples) {
      this.llmCallCounts.shift();
    }
    this.metrics.averageLlmCalls =
      this.llmCallCounts.reduce((a, b) => a + b, 0) / this.llmCallCounts.length;

    if (toolCalls) {
      for (const tool of toolCalls) {
        this.metrics.toolCallCounts[tool] =
          (this.metrics.toolCallCounts[tool] || 0) + 1;
      }
    }
  }
  getMetrics(): Metrics & {
    errorRate: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b);
    const getPercentile = (percentile: number): number => {
      if (sortedResponseTimes.length === 0) return 0;
      const index =
        Math.ceil((percentile / 100) * sortedResponseTimes.length) - 1;
      return sortedResponseTimes[Math.max(0, index)] || 0;
    };

    return {
      ...this.metrics,
      errorRate:
        this.metrics.requestCount > 0
          ? this.metrics.errorCount / this.metrics.requestCount
          : 0,
      p50ResponseTime: getPercentile(50),
      p95ResponseTime: getPercentile(95),
      p99ResponseTime: getPercentile(99),
    };
  }

  reset(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      averageLlmCalls: 0,
      toolCallCounts: {},
      lastResetTime: Date.now(),
    };
    this.responseTimes = [];
    this.llmCallCounts = [];
  }
}

export const metrics = new MetricsCollector();
