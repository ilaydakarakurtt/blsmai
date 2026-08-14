"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/join/${code}?nickname=${encodeURIComponent(nickname)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 p-6 border rounded-lg"
      >
        <h1 className="text-2xl font-bold text-center">Oyuna Katıl</h1>

        <input
          type="text"
          placeholder="Oda Kodu"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border rounded px-3 py-2 text-center text-2xl tracking-widest"
          maxLength={6}
          required
        />
        <input
          type="text"
          placeholder="Adın (takma isim)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <button
          type="submit"
          className="w-full bg-black text-white rounded px-3 py-2"
        >
          Katıl
        </button>
      </form>
    </div>
  );
}
