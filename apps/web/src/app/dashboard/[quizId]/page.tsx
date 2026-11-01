"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

interface GameSessionSummary {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  playerCount: number;
}

interface AssignmentSummary {
  id: string;
  classroomName: string;
  dueDate: string | null;
  createdAt: string;
  submissionCount: number;
}

interface QuestionStat {
  questionText: string;
  correctRate: number;
  totalAnswers: number;
}

interface Analytics {
  totalLiveSessions: number;
  avgScore: number;
  questionStats: QuestionStat[];
}

export default function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [sessions, setSessions] = useState<GameSessionSummary[]>([]);

  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [assignMessage, setAssignMessage] = useState("");
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

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

  async function fetchSessions() {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API_URL}/api/game/sessions/quiz/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
    }
  }
  async function fetchClassrooms() {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API_URL}/api/classrooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setClassrooms(data);
    }
  }
  async function fetchAssignments() {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API_URL}/api/assignments/quiz/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAssignments(data);
    }
  }
  async function fetchAnalytics() {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API_URL}/api/quizzes/${quizId}/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssignMessage("");
    const token = getToken();

    const res = await fetch(`${API_URL}/api/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quizId, classroomId: selectedClassroom }),
    });

    if (res.ok) {
      setAssignMessage("Ödev başarıyla verildi!");
      setSelectedClassroom("");
      fetchAssignments();
    } else {
      setAssignMessage("Bir hata oluştu.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuiz();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClassrooms();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssignments();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
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
        ← Geri
      </Link>

      <h1 className="text-2xl font-bold">{quiz.title}</h1>

      {analytics && analytics.totalLiveSessions > 0 && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-gray-500">Toplam Oyun</p>
              <p className="text-2xl font-bold">
                {analytics.totalLiveSessions}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ortalama Skor</p>
              <p className="text-2xl font-bold">{analytics.avgScore}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Soru Başarı Oranları</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.questionStats}>
                <XAxis dataKey="questionText" tick={false} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar
                  dataKey="correctRate"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Link
        href={`/dashboard/${quizId}/play`}
        className="inline-block bg-green-600 text-white rounded px-4 py-2"
      >
        Oyunu Başlat
      </Link>

      {sessions.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Geçmiş Oyunlar</h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/${quizId}/results/${s.id}`}
                  className="border rounded p-3 flex justify-between items-center hover:bg-gray-50 block"
                >
                  <span>{new Date(s.createdAt).toLocaleString("tr-TR")}</span>
                  <span className="text-sm text-gray-500">
                    {s.playerCount} katılımcı ·{" "}
                    {s.status === "FINISHED"
                      ? "Bitti"
                      : s.status === "IN_PROGRESS"
                        ? "Devam ediyor"
                        : "Bekliyor"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Ödev Olarak Ver</h2>
        {classrooms.length === 0 ? (
          <p className="text-sm text-gray-500">
            Önce bir sınıf oluşturman gerekiyor.
          </p>
        ) : (
          <form onSubmit={handleAssign} className="flex gap-2">
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
              required
            >
              <option value="">Sınıf seç...</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-black text-white rounded px-4 py-2"
            >
              Ödev Ver
            </button>
          </form>
        )}
        {assignMessage && (
          <p className="text-sm text-green-600">{assignMessage}</p>
        )}
      </div>

      {assignments.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Verilen Ödevler</h2>
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/${quizId}/assignments/${a.id}`}
                  className="border rounded p-3 flex justify-between items-center hover:bg-gray-50 block"
                >
                  <span>{a.classroomName}</span>
                  <span className="text-sm text-gray-500">
                    {a.submissionCount} teslim ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
