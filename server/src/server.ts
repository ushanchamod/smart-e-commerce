import app from "./app";
import dotenv from "dotenv";
dotenv.config();

import { createOwnerIfNotExists, testDbConnection } from "./db";
import http from "http";
import { Server } from "socket.io";
import { agent } from "./service/agent";
import { HumanMessage } from "@langchain/core/messages";
import z from "zod";

export const contextSchema = z.object({
  userName: z.string(),
});

const startServer = async () => {
  try {
    await testDbConnection();
    await createOwnerIfNotExists();

    const PORT = process.env.PORT || 8080;
    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: ["*"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log(`👤 New client connected: ${socket.id}`);

      socket.on("chatMessage", async (data: { message: string }) => {
        const userMessage = data.message || "your message";
        console.log(`[Message from ${socket.id}]: ${userMessage}`);

        try {
          /*
          const eventStream = agent.streamEvents(
            { messages: [new HumanMessage(userMessage)] },
            { version: "v2" }
          );

          for await (const event of eventStream) {
            if (event.event === "on_chat_model_stream") {
              const token = event.data.chunk?.content;

              if (token && typeof token === "string" && token.length > 0) {
                socket.emit("chatStream", {
                  chunk: token,
                });
              }
            }
          }

          // 3. Signal that the stream is finished
          socket.emit("chatEnd", { status: "success" });
          console.log("✅ Stream finished");

          */

          const result = await agent.invoke(
            {
              messages: [new HumanMessage(userMessage)],
            },
            { context: { userName: "John Smith" } }
          );
          socket.emit("chatResponse", result);
        } catch (error: any) {
          console.error("❌ Error in agent execution:", error.message);

          socket.emit("chatResponse", {
            messages: [
              {
                type: "ai",
                text: "I'm sorry, I encountered an error processing your request. Please try again later.",
              },
            ],
            error: error.message,
          });
        }
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
