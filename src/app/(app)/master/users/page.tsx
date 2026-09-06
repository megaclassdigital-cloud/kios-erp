"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
}

const ROLES = ["OWNER", "ADMIN", "KASIR", "STAFF_STOK"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("KASIR");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/users");
    if (!res.ok) {
      setError("Anda tidak memiliki akses ke halaman ini.");
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal membuat user.");
      return;
    }
    setUsername("");
    setPassword("");
    setName("");
    load();
  }

  async function toggleActive(user: UserRow) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    load();
  }

  async function changeRole(user: UserRow, newRole: string) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Master User (Owner)</h1>

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-5">
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Tambah User
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-900">{u.name}</td>
                <td className="px-3 py-2 text-gray-500">{u.username}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.active ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => toggleActive(u)} className="text-xs text-blue-600 hover:underline">
                    {u.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
