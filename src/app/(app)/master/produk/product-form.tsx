"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { BarcodeLabelPrinter } from "./barcode-label-printer";
import { BarcodeStep, type BarcodeMode, type KnownProduct } from "./barcode-step";

interface Category {
  id: string;
  name: string;
}

export function ProductForm({
  categories,
  knownProducts,
  onCreated,
  onAwaitingBarcodeChange,
}: {
  categories: Category[];
  knownProducts: KnownProduct[];
  onCreated: () => void;
  /** Lets the page stand its own page-wide scan capture down while this
   * form is the one waiting for a code — see the comment on the hook below. */
  onAwaitingBarcodeChange?: (awaiting: boolean) => void;
}) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState<"PHYSICAL" | "SERVICE">("PHYSICAL");
  const [serviceType, setServiceType] = useState<"PULSA" | "TOKEN_LISTRIK">("PULSA");
  const [serviceProvider, setServiceProvider] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minimumStock, setMinimumStock] = useState("5");
  const [initialStock, setInitialStock] = useState("0");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryWarnDays, setExpiryWarnDays] = useState("30");
  // No default: see barcode-step.tsx for why letting this be picked
  // silently was the most damaging thing the old form did.
  const [barcodeMode, setBarcodeMode] = useState<BarcodeMode | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [createdProduct, setCreatedProduct] = useState<{
    name: string;
    barcodeValue: string;
    barcodeType: "CODE128" | "EAN13";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isService = productType === "SERVICE";
  // A service has nothing physical to carry a barcode, so the step simply
  // does not apply to it.
  const needsBarcodeChoice = !isService;
  const canSubmit = !loading && (!needsBarcodeChoice || barcodeMode !== null);

  // This page has two things a scan could mean: find an existing product, or
  // fill in the barcode of the one being added. The capture itself lives in
  // the <ScanSources> inside the barcode step, which only renders once the
  // factory-barcode option is chosen; telling the page lets its own search
  // capture step aside, so one scan never lands in both fields.
  const awaitingBarcode = needsBarcodeChoice && barcodeMode === "EXISTING";
  useEffect(() => {
    onAwaitingBarcodeChange?.(awaitingBarcode);
  }, [awaitingBarcode, onAwaitingBarcodeChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const barcode = isService
      ? ({ mode: "NONE" } as const)
      : barcodeMode === "EXISTING"
        ? ({ mode: "SCAN_EXISTING", value: scannedBarcode, unit: "PCS" } as const)
        : ({ mode: "GENERATE_INTERNAL", unit: "PCS" } as const);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        name,
        categoryId: categoryId || undefined,
        productType,
        serviceType: isService ? serviceType : undefined,
        serviceProvider: isService ? serviceProvider || undefined : undefined,
        baseUnit: isService ? "TRANSAKSI" : "PCS",
        purchasePrice,
        sellingPrice,
        minimumStock: isService ? 0 : Number(minimumStock),
        trackInventory: !isService,
        expiryDate: isService || !expiryDate ? undefined : expiryDate,
        expiryWarnDays: isService ? undefined : Number(expiryWarnDays || 30),
        initialStock: isService ? undefined : initialStock,
        barcode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan produk.");
      return;
    }

    const createdBarcode = data.product?.barcodes?.[0];
    setCreatedProduct(
      createdBarcode
        ? {
            name: data.product.name,
            barcodeValue: createdBarcode.barcodeValue,
            barcodeType: createdBarcode.barcodeType,
          }
        : null
    );
    toast.success(`${data.product.name} tersimpan.`);

    setSku("");
    setName("");
    setPurchasePrice("");
    setSellingPrice("");
    setInitialStock("0");
    setExpiryDate("");
    setExpiryWarnDays("30");
    setScannedBarcode("");
    setBarcodeMode(null);
    setServiceProvider("");
    onCreated();
  }

  return (
    <div className="space-y-3">
      {/* Above the form, not beside it: on a phone a side column lands below
          the entire form, so the one thing needed next — the barcode to print
          and stick on — sat off-screen exactly when it mattered. */}
      {createdProduct && (
        <div className="rounded-xl border border-success/30 bg-success-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            {createdProduct.name} tersimpan
          </p>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">
            Barcode: <span className="font-mono">{createdProduct.barcodeValue}</span> — cetak dan
            tempel di kemasan bila ini barang bungkus sendiri.
          </p>
          <BarcodeLabelPrinter
            productName={createdProduct.name}
            barcodeValue={createdProduct.barcodeValue}
            barcodeType={createdProduct.barcodeType}
          />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-foreground">Tambah Produk</h2>

        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">JENIS</legend>
          <div className="flex flex-wrap gap-2">
            <TypeChip active={!isService} onClick={() => setProductType("PHYSICAL")}>
              Barang Fisik
            </TypeChip>
            <TypeChip active={isService} onClick={() => setProductType("SERVICE")}>
              Layanan (Pulsa / Token Listrik)
            </TypeChip>
          </div>
        </fieldset>

        {needsBarcodeChoice && (
          <div data-tour="barcode-step">
          <BarcodeStep
            mode={barcodeMode}
            onModeChange={setBarcodeMode}
            value={scannedBarcode}
            onValueChange={setScannedBarcode}
            knownProducts={knownProducts}
          />
          </div>
        )}

        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            {needsBarcodeChoice ? "LANGKAH 2 — DATA PRODUK" : "DATA LAYANAN"}
          </legend>
          <div data-tour="product-fields" className="grid gap-3 md:grid-cols-2">
            <Field label="Nama produk" hint="Nama yang muncul di struk, mis. Indomie Goreng.">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field
              label="SKU"
              hint="Kode singkat milik toko untuk pencarian, mis. INDOMIE-GRG. Tidak boleh sama antar produk."
            >
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Kategori" hint="Opsional. Memudahkan laporan per kelompok barang.">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
              >
                <option value="">Tanpa kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {isService ? (
              <>
                <Field label="Jenis layanan">
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as "PULSA" | "TOKEN_LISTRIK")}
                    className={inputClass}
                  >
                    <option value="PULSA">Pulsa</option>
                    <option value="TOKEN_LISTRIK">Token Listrik</option>
                  </select>
                </Field>
                <Field label="Provider" hint="Mis. Telkomsel, PLN.">
                  <input
                    value={serviceProvider}
                    onChange={(e) => setServiceProvider(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </>
            ) : (
              <Field label="Stok minimum" hint="Sistem memberi peringatan saat stok tinggal segini.">
                <input
                  type="number"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            {needsBarcodeChoice ? "LANGKAH 3 — HARGA & STOK" : "HARGA"}
          </legend>
          <div data-tour="price-fields" className="grid gap-3 md:grid-cols-2">
            <Field
              label={isService ? "Harga modal" : "Harga beli"}
              hint={
                isService
                  ? "Yang Anda bayar ke provider."
                  : "Yang Anda bayar ke supplier. Dipakai untuk menghitung laba."
              }
            >
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field
              label="Harga jual"
              hint={
                isService
                  ? "Nominal + biaya admin yang dibayar pembeli."
                  : "Yang dibayar pembeli di kasir."
              }
            >
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            {!isService && (
              <>
                <Field
                  label="Stok awal"
                  hint="Jumlah barang yang ada sekarang. Isi 0 bila barangnya belum datang."
                >
                  <input
                    type="number"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field
                  tour="expiry-fields"
                  label="Tanggal kedaluwarsa"
                  hint="Lihat tanggal di kemasan. Wajib diisi untuk barang fisik."
                >
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Ingatkan berapa hari sebelumnya?"
                  hint="Roti cukup beberapa hari, makanan kaleng bisa berbulan-bulan. Sistem mulai memperingatkan saat sisa harinya segini."
                >
                  <input
                    type="number"
                    min={0}
                    value={expiryWarnDays}
                    onChange={(e) => setExpiryWarnDays(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </>
            )}
          </div>
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Produk"}
          </button>
          {needsBarcodeChoice && barcodeMode === null && (
            <span className="text-xs text-muted-foreground">
              Pilih dulu kondisi barcode di Langkah 1.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none";

function Field({
  label,
  hint,
  children,
  tour,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  /** Anchor for the guided tour, when this one field is worth its own step. */
  tour?: string;
}) {
  return (
    <label className="block" data-tour={tour}>
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
