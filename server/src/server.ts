import app from "./app";
import dotenv from "dotenv";
import { createOwnerIfNotExists, testDbConnection } from "./db";

dotenv.config();

const startServer = async () => {
  try {
    await testDbConnection();
    await createOwnerIfNotExists();
    app.listen(process.env.PORT || 8080, () => {
      console.log(`Server running on port ${process.env.PORT || 8080}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
