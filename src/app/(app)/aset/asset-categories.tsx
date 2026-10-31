"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";

export interface CategoryRow {
  id: string;
  name: string;
  assetCount: number;
}

async function call(url: string, method: string, name?: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: name === undefined ? undefined : JSON.stringify({ name }) });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? `Server tidak merespons dengan benar (${res.status}). Muat ulang halaman lalu coba lagi.`;
  } catch {
    return "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.";
  }
}

/**
 * The categories for assets, kept on the same page as the assets: add one,
 * rename one (its assets follow), delete one that nothing uses. Collapsed by
 * default so the page stays short; open when the list is empty.
 */
export function AssetCategories({ categories, onChanged }: { categories: CategoryRow[]; onChanged: () => void }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<string | null>, done: string, after?: () => void) {
    setBusy(true);
    const problem = await action();
    setBusy(false);
    if (problem) {
      toast.error(problem);
      return;
    }
    toast.success(done);
    after?.();
    onChanged();
  }

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => call("/api/assets/categories", "POST", newName), `Kategori "${newName.trim()}" ditambahkan.`, () => setNewName(""));
  };

  return (
    <details data-tour="asset-categories" open={categories.length === 0} className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        Kategori Aset <span className="font-normal text-muted-foreground">({categories.length}) — tambah, ubah nama, atau hapus</span>
      </summary>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
            {editingId === c.id ? (
              <>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} autoFocus aria-label="Nama kategori" className="min-w-0 flex-1 rounded border border-input px-2 py-1 text-sm" />
                <button
                  disabled={busy}
                  onClick={() => run(() => call(`/api/assets/categories/${c.id}`, "PATCH", draft), "Nama kategori diubah.", () => setEditingId(null))}
                  aria-label="Simpan nama"
                  className="text-success"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingId(null)} aria-label="Batal" className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 truncate text-foreground">
                  {c.name} <span className="text-xs text-muted-foreground">({c.assetCount} aset)</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setDraft(c.name);
                    }}
                    aria-label={`Ubah nama ${c.name}`}
                    className="text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    disabled={busy || c.assetCount > 0}
                    onClick={() => run(() => call(`/api/assets/categories/${c.id}`, "DELETE"), `Kategori "${c.name}" dihapus.`)}
                    title={c.assetCount > 0 ? "Masih dipakai aset. Pindahkan asetnya dulu." : "Hapus kategori"}
                    aria-label={`Hapus ${c.name}`}
                    className="text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} placeholder="Nama kategori baru, mis. Alat Dapur" className="min-w-0 flex-1 rounded-md border border-input px-3 py-1.5 text-sm" />
        <button disabled={busy || !newName.trim()} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
          Tambah
        </button>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">Mengubah nama kategori ikut mengubah semua asetnya. Kategori yang masih dipakai tidak bisa dihapus.</p>
    </details>
  );
}
