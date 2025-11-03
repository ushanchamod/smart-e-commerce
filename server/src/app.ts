import express, { Request, Response } from "express";
import { errorHandler } from "./middlewares";
import cookieParser from "cookie-parser";
import { userRouter } from "./routes";
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
    origin: [],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  })
);

app.options("/{*any}", (req: Request, res: Response) => res.status(200).send());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello!! this is Redone City API");
});

app.use("/user", userRouter);

app.use(errorHandler);

export default app;
