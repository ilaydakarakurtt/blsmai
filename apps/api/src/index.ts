import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { register, login } from "./auth";
import { quizRouter } from "./quiz";
import { gameRouter } from "./game";
import { registerGameSocket } from "./gameSocket";
import { classroomRouter } from "./classroom";
import { assignmentRouter } from "./assignment";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const token = await register(email, password, name, role === "STUDENT" ? "STUDENT" : "TEACHER");
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

app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Token gerekli" });

  const token = authHeader.split(" ")[1];
  try {
    const jwt = require("jsonwebtoken");
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { prisma } = require("./prisma");
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch {
    res.status(401).json({ error: "Geçersiz token" });
  }
});

app.use("/api/quizzes", quizRouter);
app.use("/api/game", gameRouter);
app.use("/api/classrooms", classroomRouter);
app.use("/api/assignments", assignmentRouter);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

registerGameSocket(io);

httpServer.listen(4000, () => console.log("API çalışıyor: http://localhost:4000"));