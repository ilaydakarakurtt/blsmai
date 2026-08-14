import { Router } from "express";
import { prisma } from "./prisma";
import { requireAuth, AuthRequest } from "./middleware";

export const gameRouter = Router();

function generateRoomCode(): string {
  // 6 haneli rastgele sayısal kod, örn "482913"
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Öğretmen bir quiz için oyun oturumu başlatır
gameRouter.post("/sessions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { quizId } = req.body;
    if (!quizId) return res.status(400).json({ error: "quizId gerekli" });

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, ownerId: req.userId },
      include: { questions: true },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz bulunamadı" });
    if (quiz.questions.length === 0) {
      return res.status(400).json({ error: "Quiz'de hiç soru yok" });
    }

    let code = generateRoomCode();
    // Kod çakışmasını önlemek için tekrar kontrolü
    while (await prisma.gameSession.findUnique({ where: { code } })) {
      code = generateRoomCode();
    }

    const session = await prisma.gameSession.create({
      data: {
        code,
        quizId: quiz.id,
        status: "LOBBY",
      },
    });

    res.json(session);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Oda kodu ile oturum bilgisi al (öğrenci katılmadan önce quiz başlığını görebilsin diye)
gameRouter.get("/sessions/:code", async (req, res) => {
  const session = await prisma.gameSession.findUnique({
    where: { code: req.params.code },
    include: { quiz: true },
  });
  if (!session) return res.status(404).json({ error: "Oturum bulunamadı" });
  res.json(session);
});

// Bir quiz'in geçmiş oyun oturumlarını listele
gameRouter.get("/sessions/quiz/:quizId", requireAuth, async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: req.params.quizId as string, ownerId: req.userId },
  });
  if (!quiz) return res.status(404).json({ error: "Quiz bulunamadı" });

  const sessions = await prisma.gameSession.findMany({
    where: { quizId: quiz.id },
    include: { players: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    sessions.map((s) => ({
      id: s.id,
      code: s.code,
      status: s.status,
      createdAt: s.createdAt,
      playerCount: s.players.length,
    }))
  );
});

// Bir oturumun detaylı sonucunu getir (skor tablosu)
gameRouter.get("/sessions/id/:sessionId/results", requireAuth, async (req: AuthRequest, res) => {
  const session = await prisma.gameSession.findUnique({
    where: { id: req.params.sessionId as string },
    include: {
      quiz: true,
      players: {
        orderBy: { score: "desc" },
        include: { answers: true },
      },
    },
  });

  if (!session) return res.status(404).json({ error: "Oturum bulunamadı" });
  if (session.quiz.ownerId !== req.userId) {
    return res.status(403).json({ error: "Bu oturuma erişim yetkin yok" });
  }

  res.json({
    id: session.id,
    code: session.code,
    quizTitle: session.quiz.title,
    createdAt: session.createdAt,
    players: session.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      correctCount: p.answers.filter((a) => a.correct).length,
      totalAnswers: p.answers.length,
    })),
  });
});