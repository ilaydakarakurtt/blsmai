"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";

interface Player {
  id: string;
  nickname: string;
}

interface QuestionData {
  id: string;
  text: string;
  options: string[];
  timeLimitSec: number;
}

interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
}

type Phase = "lobby" | "question" | "finished";

export default function PlayPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();

  const [code, setCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState("");

  const [phase, setPhase] = useState<Phase>("lobby");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionMeta, setQuestionMeta] = useState({ index: 0, total: 0 });
  const [answerCount, setAnswerCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  async function startSession() {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch(`${API_URL}/api/game/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quizId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Oturum başlatılamadı");
      return;
    }

    setCode(data.code);

    const s = io(API_URL);
    s.emit("teacher_join", { code: data.code });

    s.on("player_joined", (player: Player) => {
      setPlayers((prev) => [...prev, player]);
    });

    s.on("answer_count", ({ count }: { count: number }) => {
      setAnswerCount(count);
    });

    s.on(
      "question_started",
      ({
        index,
        total,
        question,
      }: {
        index: number;
        total: number;
        question: QuestionData;
      }) => {
        setPhase("question");
        setQuestion(question);
        setQuestionMeta({ index, total });
        setAnswerCount(0);
        setTimeLeft(question.timeLimitSec);
      },
    );

    s.on(
      "game_over",
      ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
        setPhase("finished");
        setLeaderboard(leaderboard);
      },
    );

    setSocket(s);
  }

  useEffect(() => {
    if (phase !== "question" || timeLeft === null) return;
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((t) => (t !== null ? t - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, timeLeft]);

  function handleStartGame() {
    socket?.emit("start_game", { code });
  }

  function handleNext() {
    socket?.emit("next_question", { code });
  }

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      {error && <p className="text-red-600">{error}</p>}

      {!code && (
        <button
          onClick={startSession}
          className="bg-black text-white rounded px-4 py-2"
        >
          Oyunu Başlat
        </button>
      )}

      {code && phase === "lobby" && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-500">Oda Kodu</p>
            <p className="text-5xl font-bold tracking-widest">{code}</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">
              Katılan Öğrenciler ({players.length})
            </h2>
            <ul className="space-y-1">
              {players.map((p) => (
                <li key={p.id} className="border rounded px-3 py-2">
                  {p.nickname}
                </li>
              ))}
              {players.length === 0 && (
                <p className="text-gray-500 text-sm">
                  Henüz kimse katılmadı...
                </p>
              )}
            </ul>
          </div>

          <button
            onClick={handleStartGame}
            disabled={players.length === 0}
            className="w-full bg-green-600 text-white rounded px-4 py-2 disabled:opacity-40"
          >
            Oyunu Başlat ({players.length} oyuncu)
          </button>
        </div>
      )}

      {phase === "question" && question && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-500">
            Soru {questionMeta.index + 1} / {questionMeta.total}
          </p>
          <p className="text-3xl font-bold text-gray-400">
            {timeLeft ?? question.timeLimitSec}
          </p>
          <h2 className="text-2xl font-bold">{question.text}</h2>
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <div key={i} className="border rounded p-4">
                {opt}
              </div>
            ))}
          </div>
          <p className="text-gray-500">{answerCount} kişi cevapladı</p>
          <button
            onClick={handleNext}
            className="bg-black text-white rounded px-4 py-2"
          >
            {questionMeta.index + 1 >= questionMeta.total
              ? "Oyunu Bitir"
              : "Sonraki Soru"}
          </button>
        </div>
      )}

      {phase === "finished" && (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">Oyun Bitti! 🎉</h2>
          <ul className="space-y-1">
            {leaderboard.map((p, i) => (
              <li
                key={p.id}
                className="border rounded px-3 py-2 flex justify-between"
              >
                <span>
                  {i + 1}. {p.nickname}
                </span>
                <span className="font-medium">{p.score}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
