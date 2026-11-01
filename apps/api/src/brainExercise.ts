import { Router } from "express";
import { prisma } from "./prisma";
import { requireAuth, AuthRequest } from "./middleware";
import { generateExerciseQuestions } from "./ai";

export const brainExerciseRouter = Router();

// Kategoriye göre soru üret (kaydetmeden, öğrenci çözecek)
brainExerciseRouter.post("/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { category, count } = req.body;
    if (!category) return res.status(400).json({ error: "Kategori gerekli" });

    const questions = await generateExerciseQuestions(category, count ?? 5);
    res.json({ questions });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Öğrenci egzersizi tamamlayınca sonucu kaydet
brainExerciseRouter.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { category, correctCount, totalQuestions } = req.body;
    if (!category || correctCount === undefined || !totalQuestions) {
      return res.status(400).json({ error: "Eksik bilgi" });
    }

    const score = Math.round((correctCount / totalQuestions) * 100);

    const session = await prisma.brainExerciseSession.create({
      data: {
        studentId: req.userId!,
        category,
        score,
        correctCount,
        totalQuestions,
      },
    });

    res.json(session);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Öğrencinin geçmiş sonuçlarını listele
brainExerciseRouter.get("/mine", requireAuth, async (req: AuthRequest, res) => {
  const sessions = await prisma.brainExerciseSession.findMany({
    where: { studentId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(sessions);
});