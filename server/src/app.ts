import express, { Request, Response } from "express";
import { errorHandler } from "./middlewares";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes";
import cors from "cors";

const app = express();

app.use((req, res, next) => {
  console.log(`${req.method}, Request URL: ${req.url}`);
  next();
});

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  })
);

app.options("/{*any}", (req: Request, res: Response) => res.status(200).send());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello!! this is Redone City API");
});

app.use("/auth", authRouter);
app.post("/chat", (req: Request, res: Response) => {
  const userMessage = req.body.message || "your message";

  // 1. Define your sample products
  const sampleProducts = [
    {
      id: 1,
      name: "Eco-Friendly Water Bottle",
      price: 25.99,
      image: "https://picsum.photos/200",
      description: "Stay hydrated with our 100% recycled materials bottle.",
      url: "/products/1", // Add a link for a "View" button
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

  // 2. Send the structured JSON response
  res.json({
    // The text part of the reply
    reply: `You said: **${userMessage}**\n\nCertainly! Here are some products you might like:`,

    // The special UI/UX content
    products: sampleProducts,
  });
});

app.use(errorHandler);

export default app;
