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