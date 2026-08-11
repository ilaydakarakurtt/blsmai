"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export default function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  function getToken() {
    return localStorage.getItem("token");
  }

  async function fetchQuiz() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch(`${API_URL}/api/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      router.push("/dashboard");
      return;
    }

    const data = await res.json();
    setQuiz(data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuiz();
  }, [quizId]);

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();

    const res = await fetch(`${API_URL}/api/quizzes/${quizId}/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        options,
        correctIndex,
      }),
    });

    if (res.ok) {
      setText("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      fetchQuiz();
    }
  }

  function updateOption(index: number, value: string) {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  }

  if (loading) return <div className="p-8">Yükleniyor...</div>;
  if (!quiz) return null;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link href="/dashboard" className="text-sm text-gray-500 underline">
        ← Quizlerime dön
      </Link>

      <h1 className="text-2xl font-bold">{quiz.title}</h1>

      <Link
        href={`/dashboard/${quizId}/play`}
        className="inline-block bg-green-600 text-white rounded px-4 py-2"
      >
        Oyunu Başlat
      </Link>

      <ul className="space-y-2">
        {quiz.questions.map((q, i) => (
          <li key={q.id} className="border rounded p-4">
            <p className="font-medium">
              {i + 1}. {q.text}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {q.options.map((opt, idx) => (
                <li
                  key={idx}
                  className={
                    idx === q.correctIndex
                      ? "text-green-600 font-medium"
                      : "text-gray-600"
                  }
                >
                  {opt} {idx === q.correctIndex && "✓"}
                </li>
              ))}
            </ul>
          </li>
        ))}
        {quiz.questions.length === 0 && (
          <p className="text-gray-500 text-sm">
            Henüz soru yok, aşağıdan ekle.
          </p>
        )}
      </ul>

      <form
        onSubmit={handleAddQuestion}
        className="border rounded-lg p-4 space-y-3"
      >
        <h2 className="font-semibold">Yeni Soru Ekle</h2>

        <input
          type="text"
          placeholder="Soru metni"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />

        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
            />
            <input
              type="text"
              placeholder={`Seçenek ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 border rounded px-3 py-2"
              required
            />
          </div>
        ))}
        <p className="text-xs text-gray-500">
          Radyo butonu ile doğru cevabı işaretle.
        </p>

        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Soru Ekle
        </button>
      </form>
    </div>
  );
}
