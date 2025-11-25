import app from "./app";
import dotenv from "dotenv";
dotenv.config();

import { createOwnerIfNotExists, testDbConnection } from "./db";
import http from "http";
import { Server } from "socket.io";
import { createAgent } from "./service/agent/agent";
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
        origin: ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      const authHeader = socket.handshake.headers["authorization"];
      let user: JWTPayloadType | null = null;

      try {
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          user = jwt.verify(
            token,
            process.env.JWT_SECRET as string
          ) as JWTPayloadType;

          console.log(
            `✅ Auth success: ${socket.id} (${user.email || "User"})`
          );
        } else {
          console.log(`⚠️  No valid auth header for ${socket.id}`);
          // Optional: Disconnect if you require strictly authenticated users
          // socket.disconnect();
          // return;
        }
      } catch (err: any) {
        console.error(`❌ Auth failed for ${socket.id}:`, err.message);
        // Optional: Disconnect on bad token
        socket.disconnect();
        return;
      }

      socket.on("chatMessage", async (data: { message: string }) => {
        const userMessage = data.message || "";
        const agent = await createAgent();

        let configurable = {};

        if (user) {
          configurable = {
            user_id: user.userId,
            user_email: user.email,
            thread_id: socket.id,
          };
        } else {
          configurable = {
            thread_id: socket.id,
          };
        }

        try {
          console.log(`📩 Processing: ${userMessage}`);

          const eventStream = agent.streamEvents(
            { messages: [new HumanMessage(userMessage)] },
            {
              version: "v2",
              configurable,
              context: { userName: "John Smith" },
            }
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

            if (event.event === "on_tool_end") {
              console.log(`🛠️ Tool finished: ${event.name}`);

              // You can filter specifically for your product tool name here
              // if (event.name === "fetch_product_list") {
              //   socket.emit("suggestedProducts", {
              //     toolName: event.name,
              //     data: event.data.output,
              //   });
              // }
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
