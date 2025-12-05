import { Router } from "express";
import { metrics } from "../service/agent/utils/metrics";
import { llmCircuitBreaker } from "../service/agent/utils/circuitBreaker";

const router = Router();

router.get("/health", (req, res) => {
  const circuitState = llmCircuitBreaker.getState();
  const agentMetrics = metrics.getMetrics();

  res.json({
    status: "healthy",
    circuitBreaker: {
      state: circuitState,
      isHealthy: circuitState !== "OPEN",
    },
    metrics: {
      requestCount: agentMetrics.requestCount,
      errorRate: agentMetrics.errorRate,
      averageResponseTime: agentMetrics.averageResponseTime,
      averageLlmCalls: agentMetrics.averageLlmCalls,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get("/metrics", (req, res) => {
  const agentMetrics = metrics.getMetrics();

  res.json({
    ...agentMetrics,
    circuitBreaker: {
      state: llmCircuitBreaker.getState(),
    },
  });
});

export default router;
