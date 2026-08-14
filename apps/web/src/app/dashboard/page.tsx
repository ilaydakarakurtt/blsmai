"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  questions: { id: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  function getToken() {
    return localStorage.getItem("token");
  }

  async function fetchQuizzes() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch(`${API_URL}/api/quizzes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      router.push("/login");
      return;
    }

    const data = await res.json();
    setQuizzes(data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuizzes();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();

    const res = await fetch(`${API_URL}/api/quizzes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: newTitle }),
    });

    if (res.ok) {
      setNewTitle("");
      fetchQuizzes();
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Quizlerim</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          placeholder="Yeni quiz başlığı"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Oluştur
        </button>
      </form>
      <ul className="space-y-2">
        {quizzes.map((quiz) => (
          <li key={quiz.id}>
            <a
              href={`/dashboard/${quiz.id}`}
              className="border rounded p-4 flex justify-between items-center hover:bg-gray-50 block"
            >
              <span>{quiz.title}</span>
              <span className="text-sm text-gray-500">
                {quiz.questions.length} soru
              </span>
            </a>
          </li>
        ))}
        {quizzes.length === 0 && (
          <p className="text-gray-500 text-sm">
            Henüz quiz yok, yukarıdan bir tane oluştur.
          </p>
        )}
      </ul>
    </div>
  );
}
