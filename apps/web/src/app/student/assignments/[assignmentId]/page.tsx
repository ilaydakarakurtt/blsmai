"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

interface Question {
  id: string;
  text: string;
  options: string[];
}

export default function SolveAssignmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const router = useRouter();

  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/student-login");
        return;
      }

      const res = await fetch(
        `${API_URL}/api/assignments/${assignmentId}/questions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        router.push("/student/assignments");
        return;
      }

      const data = await res.json();
      setQuizTitle(data.quizTitle);
      setQuestions(data.questions);
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuestions();
  }, [assignmentId, router]);

  function selectAnswer(questionId: string, index: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function handleSubmit() {
    const token = localStorage.getItem("token");

    const answerList = Object.entries(answers).map(
      ([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex,
      }),
    );

    const res = await fetch(
      `${API_URL}/api/assignments/${assignmentId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: answerList }),
      },
    );

    if (res.ok) {
      const data = await res.json();
      setResult(data);
    }
  }

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Ödev Tamamlandı! 🎉</h1>
        <p className="text-4xl font-bold text-green-600">{result.score}</p>
        <p className="text-gray-500">
          {result.correctCount} / {result.total} doğru
        </p>
        <a
          href="/student/assignments"
          className="text-blue-600 underline text-sm"
        >
          Ödevlerime dön
        </a>
      </div>
    );
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">{quizTitle}</h1>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="border rounded p-4 space-y-2">
            <p className="font-medium">
              {i + 1}. {q.text}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => selectAnswer(q.id, idx)}
                  className={`border rounded p-2 text-sm ${
                    answers[q.id] === idx ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className="w-full bg-green-600 text-white rounded px-4 py-2 disabled:opacity-40"
      >
        Ödevi Teslim Et
      </button>
    </div>
  );
}
