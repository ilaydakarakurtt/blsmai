"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

interface UserInfo {
  name: string;
  email: string;
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/student-login");
        return;
      }
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser({ name: data.name, email: data.email });
      }
    }

    fetchUser();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/student-login");
  }

  const navItems = [
    { href: "/student/classrooms", label: "Sınıflarım" },
    { href: "/student/assignments", label: "Ödevlerim" },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-4 flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <p className="font-semibold">{user?.name ?? "..."}</p>
            <p className="text-sm text-gray-500">{user?.email ?? ""}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded text-sm ${
                  pathname === item.href
                    ? "bg-black text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 underline text-left"
        >
          Çıkış Yap
        </button>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}
