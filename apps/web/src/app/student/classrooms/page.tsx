"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

interface Classroom {
  id: string;
  name: string;
  code: string;
}

export default function StudentClassroomsPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function getToken() {
    return localStorage.getItem("token");
  }

  async function fetchClassrooms() {
    const token = getToken();
    if (!token) {
      router.push("/student-login");
      return;
    }

    const res = await fetch(`${API_URL}/api/classrooms/mine/joined`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setClassrooms(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClassrooms();
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = getToken();

    const res = await fetch(`${API_URL}/api/classrooms/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: joinCode }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Katılınamadı");
      return;
    }

    setJoinCode("");
    fetchClassrooms();
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/student-login");
  }

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Sınıflarım</h1>

      <form onSubmit={handleJoin} className="flex gap-2">
        <input
          type="text"
          placeholder="Sınıf kodu ile katıl"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          className="flex-1 border rounded px-3 py-2 text-center tracking-widest"
          maxLength={6}
          required
        />
        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Katıl
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <ul className="space-y-2">
        {classrooms.map((c) => (
          <li key={c.id} className="border rounded p-4">
            <p className="font-medium">{c.name}</p>
          </li>
        ))}
        {classrooms.length === 0 && (
          <p className="text-gray-500 text-sm">
            Henüz bir sınıfa katılmadın, yukarıdan kod ile katıl.
          </p>
        )}
      </ul>
    </div>
  );
}
