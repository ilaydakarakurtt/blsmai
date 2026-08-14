"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface Student {
  id: string;
  name: string;
  email: string;
}

interface ClassroomDetail {
  id: string;
  name: string;
  code: string;
  students: Student[];
}

export default function ClassroomDetailPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const router = useRouter();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClassroom() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.push("/dashboard/classrooms");
        return;
      }

      const data = await res.json();
      setClassroom(data);
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClassroom();
  }, [classroomId, router]);

  if (loading) return <div className="p-8">Yükleniyor...</div>;
  if (!classroom) return null;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link
        href="/dashboard/classrooms"
        className="text-sm text-gray-500 underline"
      >
        ← Sınıflarıma dön
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{classroom.name}</h1>
        <p className="text-gray-500 text-sm">Katılım kodu: {classroom.code}</p>
      </div>

      <div>
        <h2 className="font-semibold mb-2">
          Öğrenciler ({classroom.students.length})
        </h2>
        <ul className="space-y-2">
          {classroom.students.map((s) => (
            <li key={s.id} className="border rounded p-3">
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-500">{s.email}</p>
            </li>
          ))}
          {classroom.students.length === 0 && (
            <p className="text-gray-500 text-sm">
              Henüz kimse katılmadı. Öğrencilere "{classroom.code}" kodunu
              paylaş.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
