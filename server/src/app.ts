import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import {
  authRouter,
  categoryRouter,
  orderRouter,
  productRouter,
  agentRoutes,
} from "./routes";
import cors from "cors";

const app = express();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} → ${req.url}`);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.options("/{*any}", (req: Request, res: Response) => res.status(200).send());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello!! This is Redone City API");
});

app.use("/auth", authRouter);
app.use("/categories", categoryRouter);
app.use("/products", productRouter);
app.use("/orders", orderRouter);
app.use("/agent", agentRoutes);

export default app;
