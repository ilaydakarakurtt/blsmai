import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { register, login } from "./auth";
import { quizRouter } from "./quiz";
import { gameRouter } from "./game";
import { registerGameSocket } from "./gameSocket";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const token = await register(email, password, name);
    res.json({ token });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await login(email, password);
    res.json({ token });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.use("/api/quizzes", quizRouter);
app.use("/api/game", gameRouter);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

registerGameSocket(io);

httpServer.listen(4000, () => console.log("API çalışıyor: http://localhost:4000"));