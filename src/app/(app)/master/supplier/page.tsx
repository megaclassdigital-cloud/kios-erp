"use client";

import { useEffect, useState } from "react";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

interface EditState {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);

  async function load() {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data.suppliers ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: phone || undefined, address: address || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal menyimpan supplier.");
      return;
    }
    setName("");
    setPhone("");
    setAddress("");
    load();
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    const res = await fetch(`/api/suppliers/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name, phone: editing.phone, address: editing.address }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal mengubah supplier.");
      return;
    }
    setEditing(null);
    load();
  }

  async function handleDeactivate(id: string) {
    if (!window.confirm("Nonaktifkan supplier ini? Data historis penerimaan barang tetap tersimpan.")) return;
    const res = await fetch(`/api/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Master Supplier</h1>

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-4">
        <input
          placeholder="Nama supplier"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Telepon"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Alamat"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Tambah
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Telepon</th>
              <th className="px-3 py-2">Alamat</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) =>
              editing?.id === s.id ? (
                <tr key={s.id} className="border-t border-gray-100 bg-blue-50/40">
                  <td className="px-3 py-2">
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editing.phone}
                      onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editing.address}
                      onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={handleSaveEdit} className="text-xs text-blue-600 hover:underline">
                        Simpan
                      </button>
                      <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:underline">
                        Batal
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-900">{s.name}</td>
                  <td className="px-3 py-2 text-gray-500">{s.phone ?? "-"}</td>
                  <td className="px-3 py-2 text-gray-500">{s.address ?? "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() =>
                          setEditing({ id: s.id, name: s.name, phone: s.phone ?? "", address: s.address ?? "" })
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Ubah
                      </button>
                      <button onClick={() => handleDeactivate(s.id)} className="text-xs text-red-600 hover:underline">
                        Nonaktifkan
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                  Belum ada supplier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
