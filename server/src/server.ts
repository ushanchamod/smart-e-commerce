import app from "./app";
import dotenv from "dotenv";
dotenv.config();

import { createOwnerIfNotExists, testDbConnection } from "./db";
import http from "http";
import { Server } from "socket.io";
import { getRunnable } from "./service/agent/agent";
import { HumanMessage } from "@langchain/core/messages";
import z from "zod";
import { JWTPayloadType } from "./dto";
import jwt from "jsonwebtoken";

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
        origin: ["http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      const token = socket.handshake.auth.token;
      let user: JWTPayloadType | null = null;

      try {
        if (token) {
          user = jwt.verify(
            token,
            process.env.JWT_SECRET as string
          ) as JWTPayloadType;

          console.log(
            `✅ Auth success: ${socket.id} (${user.email || "User"})`
          );
        } else {
          console.log(`!!! No valid auth header for ${socket.id}`);
        }
      } catch (err: any) {
        console.error(`❌ Auth failed for ${socket.id}:`, err.message);
        socket.disconnect();
        return;
      }

      const UI_WIDGET_TOOLS = [
        "search-products",
        "get-random-product-suggestions",
        "get-product-details",
      ];

      socket.on(
        "chatMessage",
        async (data: { message: string; session_id: string }) => {
          const userMessage = data.message || "";
          const sessionId = data.session_id || "";
          const agent = await getRunnable();

          let configurable = {};

          if (user) {
            configurable = {
              user_id: user.userId,
              user_email: user.email,
              thread_id: sessionId || socket.id,
            };
          } else {
            configurable = {
              thread_id: sessionId || socket.id,
            };
          }

          try {
            console.log(`📩 Processing: ${userMessage}`);

            const eventStream = await agent.streamEvents(
              { messages: [new HumanMessage(userMessage)], llmCalls: 0 },
              {
                version: "v2",
                configurable,
                context: { userName: user ? user.firstName : "Guest" },
              }
            );

            for await (const event of eventStream) {
              if (event.event === "on_chat_model_stream") {
                const chunk = event.data.chunk;
                const token =
                  chunk && typeof chunk.content === "string"
                    ? chunk.content
                    : "";

                if (token.length > 0) {
                  socket.emit("chatStream", {
                    chunk: token,
                  });
                }
              }

              if (event.event === "on_tool_end") {
                console.log(`🛠️ Tool finished: ${event.name}`);

                if (UI_WIDGET_TOOLS.includes(event.name)) {
                  try {
                    const toolData = JSON.parse(event.data.output);

                    const dataToSend = Array.isArray(toolData)
                      ? toolData
                      : [toolData];

                    socket.emit("suggestedProducts", {
                      toolName: event.name,
                      data: dataToSend,
                    });
                  } catch (e) {
                    console.log(
                      `!!! Tool output was not JSON, sending as text: ${event.data.output}`
                    );
                    socket.emit("chatStream", {
                      chunk: `\n\n*System Note:* ${event.data.output}\n\n`,
                    });
                  }
                }
              }
            }

            socket.emit("chatEnd", { status: "success" });
            console.log("✅ Stream finished");
          } catch (error: any) {
            console.error("❌ Error in agent execution:", error.message);

            socket.emit("chatEnd", {
              status: "error",
              error: error.message,
            });
          }
        }
      );

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
