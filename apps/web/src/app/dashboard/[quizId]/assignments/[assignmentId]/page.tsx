"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface StudentResult {
  studentId: string;
  studentName: string;
  completed: boolean;
  score: number | null;
}

interface AssignmentResults {
  id: string;
  quizTitle: string;
  classroomName: string;
  totalQuestions: number;
  results: StudentResult[];
}

export default function AssignmentResultsPage() {
  const { quizId, assignmentId } = useParams<{
    quizId: string;
    assignmentId: string;
  }>();
  const router = useRouter();
  const [data, setData] = useState<AssignmentResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(
        `${API_URL}/api/assignments/${assignmentId}/results`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        router.push(`/dashboard/${quizId}`);
        return;
      }

      const result = await res.json();
      setData(result);
      setLoading(false);
    }

    fetchResults();
  }, [assignmentId, quizId, router]);

  if (loading) return <div className="p-8">Yukleniyor...</div>;
  if (!data) return null;

  const completedCount = data.results.filter((r) => r.completed).length;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link
        href={`/dashboard/assignments`}
        className="text-sm text-gray-500 underline"
      >
        ← Geri
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{data.quizTitle}</h1>
        <p className="text-gray-500 text-sm">
          {data.classroomName} - {completedCount} / {data.results.length}{" "}
          tamamladi
        </p>
      </div>

      <ul className="space-y-2">
        {data.results.map((r) => (
          <li
            key={r.studentId}
            className="border rounded p-4 flex justify-between items-center"
          >
            <span className="font-medium">{r.studentName}</span>
            {r.completed ? (
              <span className="text-green-600 font-medium">{r.score} puan</span>
            ) : (
              <span className="text-gray-400 text-sm">Henuz cevaplamadi</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
