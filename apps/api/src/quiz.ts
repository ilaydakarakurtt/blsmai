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
    where: { id: req.params.id as string, ownerId: req.userId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return res.status(404).json({ error: "Quiz bulunamadı" });
  res.json(quiz);
});

// Quize soru ekle
quizRouter.post("/:id/questions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id as string, ownerId: req.userId },
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
// Quiz için istatistikler (canlı oyun + ödev cevapları birleştirilmiş)
quizRouter.get("/:id/analytics", requireAuth, async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: req.params.id as string, ownerId: req.userId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return res.status(404).json({ error: "Quiz bulunamadı" });

const questionIds = quiz.questions.map((q) => q.id);

  // Canlı oyunlardaki cevaplar
  const liveAnswers = await prisma.answer.findMany({
    where: { questionId: { in: questionIds } },
  });

  // Ödevlerdeki cevaplar
  const assignmentAnswers = await prisma.assignmentAnswer.findMany({
    where: { questionId: { in: questionIds } },
  });

  const totalLiveSessions = await prisma.gameSession.count({
    where: { quizId: quiz.id, status: "FINISHED" },
  });

  const allPlayers = await prisma.player.findMany({
    where: { session: { quizId: quiz.id, status: "FINISHED" } },
  });
  const avgScore =
    allPlayers.length > 0
      ? Math.round(allPlayers.reduce((sum, p) => sum + p.score, 0) / allPlayers.length)
      : 0;

  const questionStats = quiz.questions.map((q) => {
    const liveForQ = liveAnswers.filter((a) => a.questionId === q.id);
    const assignForQ = assignmentAnswers.filter((a) => a.questionId === q.id);
    const total = liveForQ.length + assignForQ.length;
    const correct =
      liveForQ.filter((a) => a.correct).length + assignForQ.filter((a) => a.correct).length;

    return {
      questionText: q.text,
      correctRate: total > 0 ? Math.round((correct / total) * 100) : 0,
      totalAnswers: total,
    };
  });

  res.json({
    totalLiveSessions,
    avgScore,
    questionStats,
  });
});