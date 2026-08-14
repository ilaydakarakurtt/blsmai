"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface AssignmentOverview {
  id: string;
  quizId: string;
  quizTitle: string;
  classroomName: string;
  totalStudents: number;
  submissionCount: number;
  createdAt: string;
}

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/assignments/mine/teacher`, {
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
      <h1 className="text-2xl font-bold">Verilen Ödevler</h1>

      <ul className="space-y-2">
        {assignments.map((a) => (
          <li key={a.id}>
            <Link
              href={`/dashboard/${a.quizId}/assignments/${a.id}`}
              className="border rounded p-4 flex justify-between items-center hover:bg-gray-50 block"
            >
              <div>
                <p className="font-medium">{a.quizTitle}</p>
                <p className="text-sm text-gray-500">{a.classroomName}</p>
              </div>
              <span className="text-sm text-gray-500">
                {a.submissionCount} / {a.totalStudents} teslim
              </span>
            </Link>
          </li>
        ))}
        {assignments.length === 0 && (
          <p className="text-gray-500 text-sm">Henüz hiç ödev vermedin.</p>
        )}
      </ul>
    </div>
  );
}
