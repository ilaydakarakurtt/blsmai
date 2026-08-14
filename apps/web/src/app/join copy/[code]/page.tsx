"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";

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

type Phase =
  | "connecting"
  | "error"
  | "waiting"
  | "question"
  | "answered"
  | "timeout"
  | "revealed"
  | "finished";

export default function JoinRoomPage() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const nickname = searchParams.get("nickname") || "Oyuncu";

  const [phase, setPhase] = useState<Phase>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);

  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    scoreGained: number;
    totalScore: number;
    correctIndex: number;
  } | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const s: Socket = io(API_URL);

    s.emit("join_room", { code, nickname });
    console.log("Socket bağlandı:", s.id);

    s.on("joined_success", () => {
      setPhase("waiting");
    });

    s.on("error_message", (msg: string) => {
      setErrorMsg(msg);
      setPhase("error");
    });

    s.on("question_started", ({ question }: { question: QuestionData }) => {
      setPhase("question");
      setQuestion(question);
      setSelectedIndex(null);
      setLastResult(null);
      setTimeLeft(question.timeLimitSec);
    });

    s.on(
      "answer_result",
      (result: {
        correct: boolean;
        scoreGained: number;
        totalScore: number;
        correctIndex: number;
      }) => {
        setLastResult(result);
        setPhase("answered");
      },
    );

    s.on(
      "question_ended",
      ({
        correctIndex,
        leaderboard,
      }: {
        correctIndex: number;
        leaderboard: LeaderboardEntry[];
      }) => {
        console.log("question_ended alındı!", correctIndex, leaderboard);
        setPhase("revealed");
        setCorrectIndex(correctIndex);
        setLeaderboard(leaderboard);
      },
    );

    s.on(
      "game_over",
      ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) => {
        setPhase("finished");
        setLeaderboard(leaderboard);
      },
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [code, nickname]);

  useEffect(() => {
    if (phase !== "question" || timeLeft === null) return;

    if (timeLeft <= 0) {
      if (selectedIndex === null) {
        setPhase("timeout");
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((t) => (t !== null ? t - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, timeLeft, selectedIndex]);

  function handleAnswer(index: number) {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
    socket?.emit("submit_answer", { selectedIndex: index });
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      {phase === "connecting" && <p>Bağlanılıyor...</p>}

      {phase === "error" && (
        <div>
          <p className="text-red-600 font-medium">{errorMsg}</p>
          <a href="/join" className="text-sm text-gray-500 underline">
            Geri dön
          </a>
        </div>
      )}

      {phase === "waiting" && (
        <div>
          <p className="text-2xl font-bold mb-2">Merhaba, {nickname}!</p>
          <p className="text-gray-500">Oyunun başlamasını bekliyorsun...</p>
        </div>
      )}

      {phase === "question" && question && (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-2xl font-bold text-gray-400">
            {timeLeft ?? question.timeLimitSec}
          </p>
          <h2 className="text-xl font-bold">{question.text}</h2>
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className="border rounded p-4 bg-white active:bg-gray-100"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "answered" && lastResult && question && (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-3xl">
            {lastResult.correct ? "✅ Doğru!" : "❌ Yanlış"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => {
              let colorClass = "border bg-white";
              if (i === lastResult.correctIndex) {
                colorClass =
                  "border-2 border-green-600 bg-green-100 text-green-800";
              } else if (i === selectedIndex) {
                colorClass = "border-2 border-red-600 bg-red-100 text-red-800";
              }
              return (
                <div key={i} className={`rounded p-4 ${colorClass}`}>
                  {opt}
                </div>
              );
            })}
          </div>

          {lastResult.correct && (
            <p className="text-gray-600">+{lastResult.scoreGained} puan</p>
          )}
          <p className="text-gray-500">Toplam: {lastResult.totalScore}</p>
          <p className="text-gray-400 text-sm">Sıradaki soru bekleniyor...</p>
        </div>
      )}

      {phase === "timeout" && (
        <div>
          <p className="text-3xl mb-2">⏰ Süre Doldu</p>
          <p className="text-gray-500">
            Cevap veremedin, sıradaki soruyu bekle.
          </p>
        </div>
      )}

      {phase === "revealed" && (
        <div className="w-full max-w-sm">
          {question && correctIndex !== null && (
            <div className="mb-4">
              <p className="text-gray-500 text-sm">Doğru Cevap</p>
              <p className="text-lg font-bold text-green-600">
                {question.options[correctIndex]}
              </p>
            </div>
          )}
          <h3 className="font-semibold mb-2">Skor Tablosu</h3>
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
          <p className="text-gray-400 text-sm mt-4">
            Sıradaki soru bekleniyor...
          </p>
        </div>
      )}

      {phase === "finished" && (
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-4">Oyun Bitti! 🎉</h2>
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
