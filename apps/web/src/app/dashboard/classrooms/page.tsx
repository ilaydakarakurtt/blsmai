"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface Classroom {
  id: string;
  name: string;
  code: string;
  studentCount: number;
  createdAt: string;
}

export default function ClassroomsPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  function getToken() {
    return localStorage.getItem("token");
  }

  async function fetchClassrooms() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch(`${API_URL}/api/classrooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      router.push("/dashboard");
      return;
    }

    const data = await res.json();
    setClassrooms(data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClassrooms();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();

    const res = await fetch(`${API_URL}/api/classrooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      setNewName("");
      fetchClassrooms();
    }
  }

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link href="/dashboard" className="text-sm text-gray-500 underline">
        ← Quizlerime dön
      </Link>

      <h1 className="text-2xl font-bold">Sınıflarım</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          placeholder="Yeni sınıf adı (örn. 9-A Sınıfı)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Oluştur
        </button>
      </form>

      <ul className="space-y-2">
        {classrooms.map((c) => (
          <li key={c.id}>
            <Link
              href={`/dashboard/classrooms/${c.id}`}
              className="border rounded p-4 flex justify-between items-center hover:bg-gray-50 block"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-gray-500">Kod: {c.code}</p>
              </div>
              <span className="text-sm text-gray-500">
                {c.studentCount} öğrenci
              </span>
            </Link>
          </li>
        ))}
        {classrooms.length === 0 && (
          <p className="text-gray-500 text-sm">
            Henüz sınıf yok, yukarıdan bir tane oluştur.
          </p>
        )}
      </ul>
    </div>
  );
}
