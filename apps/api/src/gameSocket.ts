import { Server, Socket } from "socket.io";
import { prisma } from "./prisma";

interface GameQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
  points: number;
  order: number;
}

interface RoomState {
  quizId: string;
  questions: GameQuestion[];
  currentIndex: number;
  questionStartedAt: number | null;
  answeredPlayerIds: Set<string>;
}

const rooms = new Map<string, RoomState>();

async function getLeaderboard(sessionCode: string) {
  const session = await prisma.gameSession.findUnique({
    where: { code: sessionCode },
    include: { players: { orderBy: { score: "desc" }, take: 5 } },
  });
  return (session?.players ?? []).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    score: p.score,
  }));
}

export function registerGameSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    // Öğrenci bir oda koduyla katılır
    socket.on("join_room", async ({ code, nickname }: { code: string; nickname: string }) => {
      if (!code || !nickname) {
        socket.emit("error_message", "Kod ve isim gerekli");
        return;
      }

      const session = await prisma.gameSession.findUnique({ where: { code } });

      if (!session) {
        socket.emit("error_message", "Oda bulunamadı");
        return;
      }

      const player = await prisma.player.create({
        data: { sessionId: session.id, nickname },
      });

      socket.join(code);
      socket.data.playerId = player.id;
      socket.data.roomCode = code;

      io.to(code).emit("player_joined", { id: player.id, nickname: player.nickname });
      socket.emit("joined_success", { playerId: player.id });
    });

    // Öğretmen odaya katılır (sadece izlemek için)
    socket.on("teacher_join", ({ code }: { code: string }) => {
      socket.join(code);
      socket.data.roomCode = code;
    });

    // Öğretmen oyunu başlatır
    socket.on("start_game", async ({ code }: { code: string }) => {
      const session = await prisma.gameSession.findUnique({
        where: { code },
        include: { quiz: { include: { questions: { orderBy: { order: "asc" } } } } },
      });
      if (!session) return;

      rooms.set(code, {
        quizId: session.quizId,
        questions: session.quiz.questions,
        currentIndex: 0,
        questionStartedAt: Date.now(),
        answeredPlayerIds: new Set(),
      });

      await prisma.gameSession.update({
        where: { code },
        data: { status: "IN_PROGRESS" },
      });

      const q = session.quiz.questions[0];
      io.to(code).emit("question_started", {
        index: 0,
        total: session.quiz.questions.length,
        question: {
          id: q.id,
          text: q.text,
          options: q.options,
          timeLimitSec: q.timeLimitSec,
        },
      });
    });

    // Öğrenci cevap verir
    socket.on("submit_answer", async ({ selectedIndex }: { selectedIndex: number }) => {
      const code = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!code || !playerId) return;

      const room = rooms.get(code);
      if (!room || room.questionStartedAt === null) return;
      if (room.answeredPlayerIds.has(playerId)) return; // aynı soruya iki kez cevap vermeyi engelle

      const question = room.questions[room.currentIndex];
      const elapsedMs = Date.now() - room.questionStartedAt;
      const timeLimitMs = question.timeLimitSec * 1000;

      if (elapsedMs > timeLimitMs) {
        socket.emit("answer_result", {
          correct: false,
          scoreGained: 0,
          totalScore: (await prisma.player.findUnique({ where: { id: playerId } }))?.score ?? 0,
          correctIndex: question.correctIndex,
        });
        return;
      }

      room.answeredPlayerIds.add(playerId);

      const correct = selectedIndex === question.correctIndex;

      let scoreGained = 0;
      if (correct) {
        const speedRatio = Math.max(0, 1 - elapsedMs / timeLimitMs);
        scoreGained = Math.round(question.points * (0.5 + 0.5 * speedRatio));
      }

      await prisma.answer.create({
        data: {
          playerId,
          questionId: question.id,
          selectedIndex,
          correct,
          responseTimeMs: elapsedMs,
        },
      });

      const player = await prisma.player.update({
        where: { id: playerId },
        data: { score: { increment: scoreGained } },
      });

      socket.emit("answer_result", {
        correct,
        scoreGained,
        totalScore: player.score,
        correctIndex: question.correctIndex,
      });

      io.to(code).emit("answer_count", { count: room.answeredPlayerIds.size });
    });

    // Öğretmen doğru cevabı ve skor tablosunu açıklar
    socket.on("reveal_answer", async ({ code }: { code: string }) => {
      const room = rooms.get(code);
      if (!room) return;

      const question = room.questions[room.currentIndex];
      const leaderboard = await getLeaderboard(code);

      io.to(code).emit("question_ended", {
        correctIndex: question.correctIndex,
        leaderboard,
      });

      room.questionStartedAt = null;
    });

    // Öğretmen sonraki soruya geçer (ya da oyunu bitirir)
    socket.on("next_question", async ({ code }: { code: string }) => {
      const room = rooms.get(code);
      if (!room) return;

      const nextIndex = room.currentIndex + 1;

      if (nextIndex >= room.questions.length) {
        const leaderboard = await getLeaderboard(code);
        await prisma.gameSession.update({
          where: { code },
          data: { status: "FINISHED" },
        });
        io.to(code).emit("game_over", { leaderboard });
        rooms.delete(code);
        return;
      }

      room.currentIndex = nextIndex;
      room.questionStartedAt = Date.now();
      room.answeredPlayerIds = new Set();

      const q = room.questions[nextIndex];
      io.to(code).emit("question_started", {
        index: nextIndex,
        total: room.questions.length,
        question: {
          id: q.id,
          text: q.text,
          options: q.options,
          timeLimitSec: q.timeLimitSec,
        },
      });
    });

    socket.on("disconnect", () => {
      // Şimdilik ekstra bir işlem yapmıyoruz
    });
  });
}