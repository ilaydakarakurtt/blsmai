"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface PlayerResult {
  id: string;
  nickname: string;
  score: number;
  correctCount: number;
  totalAnswers: number;
}

interface SessionResult {
  id: string;
  code: string;
  quizTitle: string;
  createdAt: string;
  players: PlayerResult[];
}

export default function SessionResultsPage() {
  const { quizId, sessionId } = useParams<{ quizId: string; sessionId: string }>();
  const router = useRouter();
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResult() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/game/sessions/id/${sessionId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.push(`/dashboard/${quizId}`);
        return;
      }

      const data = await res.json();
      setResult(data);
      setLoading(false);
    }

    fetchResult();
  }, [sessionId, quizId, router]);

  if (loading) return <div className="p-8">Yukleniyor...</div>;
  if (!result) return null;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link href={`/dashboard/${quizId}`} className="text-sm text-gray-500 underline">
        Quize don
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{result.quizTitle}</h1>
        <p className="text-gray-500 text-sm">
          {new Date(result.createdAt).toLocaleString("tr-TR")} - Kod: {result.code}
        </p>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Sonuclar</h2>
        <ul className="space-y-2">
          {result.players.map((p, i) => (
            <li key={p.id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {i + 1}. {p.nickname}
                </p>
                <p className="text-sm text-gray-500">
                  {p.correctCount} / {p.totalAnswers} dogru
                </p>
              </div>
              <p className="text-xl font-bold">{p.score}</p>
            </li>
          ))}
          {result.players.length === 0 && (
            <p className="text-gray-500 text-sm">Bu oturuma hic katilimci olmamis.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
