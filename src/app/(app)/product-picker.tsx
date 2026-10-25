"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface PickerItem {
  id?: string;
  name: string;
  sku?: string;
  barcode: string;
  currentStock?: string;
  sellingPrice?: string;
  baseUnit?: string;
}

/**
 * Find a product by typing part of its name (or SKU, or barcode digits) and
 * choose it from the list. It is the way in when a barcode will not scan or
 * was typed wrong: what is chosen is a product that exists, never a free-typed
 * code.
 *
 * Nothing is picked on its own. Even a single match waits for a click or
 * Enter, so a slipped key cannot put the wrong item on a receipt or a till.
 * `search` runs in the browser over data already loaded (the till) or against
 * the server (the other screens); either way it returns the list to show.
 */
export function ProductPicker({
  search,
  onPick,
  label = "Cari berdasarkan nama",
  hint,
  placeholder = "Ketik nama barang, SKU, atau sebagian angka barcode",
}: {
  search: (query: string) => PickerItem[] | Promise<PickerItem[]>;
  onPick: (item: PickerItem) => void;
  label?: string;
  hint?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerItem[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputId = useId();
  // A slow answer to an old keystroke must never replace a newer one.
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const ticket = ++latest.current;
    const handle = setTimeout(async () => {
      let found: PickerItem[] = [];
      try {
        found = await search(q);
      } catch {
        found = [];
      }
      if (ticket !== latest.current) return;
      setResults(found);
      setActive(0);
      setSearched(true);
      setOpen(true);
    }, 200);
    return () => clearTimeout(handle);
    // `search` is re-created on every render by callers; the query is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function choose(item: PickerItem) {
    onPick(item);
    setQuery("");
    setResults([]);
    setOpen(false);
    setSearched(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      // Never submit an enclosing form (the scan box's own form, say).
      e.preventDefault();
      if (open && results[active]) choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && results.length > 0}
          className="w-full rounded-md border border-input py-2 pr-3 pl-9 text-sm focus:border-ring focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}

      {open && results.length > 0 && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-card text-sm shadow-lg">
          {results.map((item, i) => (
            <li key={item.barcode} role="option" aria-selected={i === active}>
              <button
                type="button"
                // mousedown, not click: the input's blur would otherwise close
                // the list before the click lands.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${i === active ? "bg-muted" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{item.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {[item.sku, item.barcode].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                  {item.sellingPrice !== undefined && <span className="block">Rp{Number(item.sellingPrice).toLocaleString("id-ID")}</span>}
                  {item.currentStock !== undefined && (
                    <span className="block">stok {Number(item.currentStock).toLocaleString("id-ID")} {item.baseUnit ?? ""}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && searched && results.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Tidak ada barang yang cocok. Coba kata lain atau lebih pendek.
        </p>
      )}
    </div>
  );
}

/** Search the server for one screen's scope; for screens that do not already hold the catalog. */
export function serverSearch(scope: "receiving" | "stockout" | "opname" | "audit") {
  return async (query: string): Promise<PickerItem[]> => {
    const res = await fetch(`/api/products/search?scope=${scope}&q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return data.products ?? [];
  };
}
