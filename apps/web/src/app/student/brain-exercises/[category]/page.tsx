"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

interface Question {
  text: string;
  visual?: string;
  options: string[];
  correctIndex: number;
}

const categoryLabels: Record<string, string> = {
  MEMORY: "Hafiza",
  LOGIC: "Mantik",
  MATH: "Matematik",
  ATTENTION: "Dikkat",
};

export default function ExerciseSolvePage() {
  const { category } = useParams<{ category: string }>();
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function fetchQuestions() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/student-login");
        return;
      }

      const res = await fetch(`${API_URL}/api/brain-exercises/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, count: 5 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sorular uretilemedi");
        setLoading(false);
        return;
      }

      setQuestions(data.questions);
      setLoading(false);
    }

    fetchQuestions();
  }, [category, router]);

  async function handleAnswer(index: number) {
    if (selected !== null) return;
    setSelected(index);

    const isCorrect = index === questions[currentIndex].correctIndex;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    if (isCorrect) setCorrectCount(newCorrectCount);

    setTimeout(async () => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setSelected(null);
      } else {
        setFinished(true);
        const token = localStorage.getItem("token");
        await fetch(`${API_URL}/api/brain-exercises/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category,
            correctCount: newCorrectCount,
            totalQuestions: questions.length,
          }),
        });
      }
    }, 1000);
  }

  if (loading) return <div className="p-8">Sorular hazirlaniyor...</div>;

  if (error) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-red-600">{error}</p>
        <a href="/student/brain-exercises" className="text-blue-600 underline text-sm">
          Geri don
        </a>
      </div>
    );
  }

  if (finished) {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Tamamlandi! 🎉</h1>
        <p className="text-4xl font-bold text-green-600">{score}</p>
        <p className="text-gray-500">
          {correctCount} / {questions.length} dogru
        </p>
        <a href="/student/brain-exercises" className="text-blue-600 underline text-sm">
          Egzersizlere don
        </a>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="max-w-md mx-auto p-8 space-y-6">
      <div className="flex justify-between text-sm text-gray-500">
        <span>{categoryLabels[category] ?? category}</span>
        <span>
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <h2 className="text-xl font-bold text-center">{q.text}</h2>

      {q.visual && (
        <div className="bg-gray-50 border rounded-lg p-6 text-center text-2xl font-mono whitespace-pre-line leading-relaxed">
          {q.visual}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          let colorClass = "bg-white";
          if (selected !== null) {
            if (i === q.correctIndex) colorClass = "bg-green-100 border-green-600";
            else if (i === selected) colorClass = "bg-red-100 border-red-600";
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className={`border-2 rounded p-4 ${colorClass}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
