"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface Assignment {
  id: string;
  quizId: string;
  quizTitle: string;
  classroomName: string;
  questionCount: number;
  dueDate: string | null;
  completed: boolean;
  score: number | null;
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/student-login");
        return;
      }

      const res = await fetch(`${API_URL}/api/assignments/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssignments();
  }, [router]);

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link
        href="/student/classrooms"
        className="text-sm text-gray-500 underline"
      >
        ← Sınıflarıma dön
      </Link>

      <h1 className="text-2xl font-bold">Ödevlerim</h1>

      <ul className="space-y-2">
        {assignments.map((a) => (
          <li key={a.id}>
            <Link
              href={a.completed ? "#" : `/student/assignments/${a.id}`}
              className={`border rounded p-4 flex justify-between items-center block ${
                a.completed ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              <div>
                <p className="font-medium">{a.quizTitle}</p>
                <p className="text-sm text-gray-500">
                  {a.classroomName} · {a.questionCount} soru
                </p>
              </div>
              {a.completed ? (
                <span className="text-green-600 font-medium">
                  Tamamlandı: {a.score}
                </span>
              ) : (
                <span className="text-blue-600 text-sm">Başla →</span>
              )}
            </Link>
          </li>
        ))}
        {assignments.length === 0 && (
          <p className="text-gray-500 text-sm">
            Henüz sana atanmış bir ödev yok.
          </p>
        )}
      </ul>
    </div>
  );
}
