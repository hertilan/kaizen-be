import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ service: "kaizen-be", status: "running" });
});

app.listen(PORT, () => {
  console.log(`[kaizen-be] Server running on http://localhost:${PORT}`);
});