"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface Session {
  id: string;
  category: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  createdAt: string;
}

const categories = [
  { key: "MEMORY", label: "Hafiza", color: "bg-purple-100 text-purple-800", emoji: "🧠" },
  { key: "LOGIC", label: "Mantik", color: "bg-blue-100 text-blue-800", emoji: "🧩" },
  { key: "MATH", label: "Matematik", color: "bg-green-100 text-green-800", emoji: "🔢" },
  { key: "ATTENTION", label: "Dikkat", color: "bg-orange-100 text-orange-800", emoji: "👁️" },
];

export default function BrainExercisesPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/student-login");
        return;
      }

      const res = await fetch(`${API_URL}/api/brain-exercises/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
      setLoading(false);
    }

    fetchSessions();
  }, [router]);

  const categoryLabel = (key: string) => categories.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">Beyin Egzersizleri</h1>

      <div>
        <h2 className="font-semibold mb-3">Bir alan sec</h2>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((c) => (
            <Link
              key={c.key}
              href={`/student/brain-exercises/${c.key}`}
              className={`rounded-lg p-6 text-center hover:opacity-80 ${c.color}`}
            >
              <div className="text-3xl mb-2">{c.emoji}</div>
              <p className="font-semibold">{c.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Gecmis Sonuclarin</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Yukleniyor...</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="border rounded p-3 flex justify-between items-center">
                <span>{categoryLabel(s.category)}</span>
                <span className="text-sm text-gray-500">
                  {s.correctCount}/{s.totalQuestions} - {s.score} puan -{" "}
                  {new Date(s.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </li>
            ))}
            {sessions.length === 0 && (
              <p className="text-gray-500 text-sm">Henuz bir egzersiz cozmedin.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
