"use client";

import { useEffect, useState } from "react";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

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
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-900">{s.name}</td>
                <td className="px-3 py-2 text-gray-500">{s.phone ?? "-"}</td>
                <td className="px-3 py-2 text-gray-500">{s.address ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
