import express, { Request, Response } from "express";
import { errorHandler } from "./middlewares";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes";
import cors from "cors";

const app = express();

// =========================
// Global Request Logger
// =========================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} → ${req.url}`);
  next();
});

// =========================
// Body Parsers
// =========================
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// =========================
// CORS
// =========================
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.options("/{*any}", (req: Request, res: Response) => res.status(200).send());

// =========================
// Health Check
// =========================
app.get("/", (req: Request, res: Response) => {
  res.send("Hello!! This is Redone City API");
});

// =========================
// Auth Routes
// =========================
app.use("/auth", authRouter);

// =========================
// Chat Route
// =========================
app.post("/chat", (req: Request, res: Response) => {
  const userMessage = req.body.message || "your message";

  const sampleProducts = [
    {
      id: 1,
      name: "Eco-Friendly Water Bottle",
      price: 25.99,
      image: "https://picsum.photos/200",
      description: "Stay hydrated with our 100% recycled materials bottle.",
      url: "/products/1",
    },
    {
      id: 2,
      name: "Wireless Headphones",
      price: 149.99,
      image: "https://picsum.photos/200",
      description: "Immerse yourself in music with 40-hour battery life.",
      url: "/products/2",
    },
  ];

  res.json({
    reply: `You said: **${userMessage}**\n\nHere are some products you might like:`,
    products: sampleProducts,
  });
});

// =========================
// Error Handler
// =========================
app.use(errorHandler);

export default app;
