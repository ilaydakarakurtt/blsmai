import { Router } from "express";
import { prisma } from "./prisma";
import { requireAuth, AuthRequest } from "./middleware";

export const quizRouter = Router();

// Quiz oluştur
quizRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Başlık gerekli" });

    const quiz = await prisma.quiz.create({
      data: {
        title,
        ownerId: req.userId!,
      },
    });
    res.json(quiz);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Kendi quizlerini listele
quizRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: req.userId },
    include: { questions: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(quizzes);
});

// Tek bir quiz detayı (sorularla birlikte)
quizRouter.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return res.status(404).json({ error: "Quiz bulunamadı" });
  res.json(quiz);
});

// Quize soru ekle
quizRouter.post("/:id/questions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz bulunamadı" });

    const { text, options, correctIndex, timeLimitSec, points, order } = req.body;
    if (!text || !options || correctIndex === undefined) {
      return res.status(400).json({ error: "text, options, correctIndex gerekli" });
    }

    const question = await prisma.question.create({
      data: {
        quizId: quiz.id,
        text,
        options,
        correctIndex,
        timeLimitSec: timeLimitSec ?? 20,
        points: points ?? 1000,
        order: order ?? 0,
      },
    });
    res.json(question);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});