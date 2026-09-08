"use client";

import { useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
}

export default function KategoriPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/categories");
    const data = await res.json().catch(() => ({}));
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal menambah kategori.");
      return;
    }
    setName("");
    load();
  }

  async function handleRename(id: string) {
    setError(null);
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal mengubah kategori.");
      return;
    }
    setEditingId(null);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Kategori Produk</h1>

      <form onSubmit={handleCreate} className="flex gap-2 rounded-lg border border-gray-200 bg-white p-4">
        <input
          placeholder="Nama kategori baru"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Tambah
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Nama Kategori</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-900">
                  {editingId === c.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {editingId === c.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleRename(c.id)} className="text-xs text-blue-600 hover:underline">
                        Simpan
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingName(c.name);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ubah Nama
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center text-gray-400">
                  Belum ada kategori.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
