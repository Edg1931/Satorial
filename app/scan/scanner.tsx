"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Link from "next/link";
import { Card } from "@/components/ui";
import { dollars } from "@/lib/format";
import type { Item } from "@/lib/types";

type LookupResult = { item: Item | null; recent?: Array<{ id: number; sold_at: string; quantity: number }> };

export default function Scanner({ initialCode }: { initialCode: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [running, setRunning] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => stop();
  }, []);

  useEffect(() => {
    if (initialCode) lookup(initialCode);
  }, [initialCode]);

  async function start() {
    setError(null);
    if (!videoRef.current || !readerRef.current) return;
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId || devices[0]?.deviceId;
      const controls = await readerRef.current.decodeFromVideoDevice(deviceId || undefined, videoRef.current, (res, err) => {
        if (res) {
          const text = res.getText();
          setCode(text);
          lookup(text);
          stop();
        }
      });
      controlsRef.current = controls as unknown as { stop: () => void };
      setRunning(true);
    } catch (e: any) {
      setError(e?.message || "Could not access camera");
    }
  }

  function stop() {
    controlsRef.current?.stop?.();
    controlsRef.current = null;
    setRunning(false);
  }

  async function lookup(c: string) {
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/scan/${encodeURIComponent(c.trim())}`);
      if (r.ok) {
        const j = await r.json();
        setResult(j);
        if (!j.item) setError("No item matches that code.");
      } else {
        setError("Lookup failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function adjust(itemId: number, delta: number) {
    setBusy(true);
    await fetch(`/api/inventory/${itemId}/adjust`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta }) });
    if (result?.item) await lookup(result.item.barcode);
  }

  async function quickSell(itemId: number) {
    setBusy(true);
    await fetch(`/api/sales/quick`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_id: itemId, quantity: 1 }) });
    if (result?.item) await lookup(result.item.barcode);
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-black border border-[var(--line-soft)] relative">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {!running && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <button className="btn btn-primary" onClick={start}>Start camera</button>
            </div>
          )}
          {running && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[35%] rounded-md border-2 border-[var(--accent)]/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          {running ? (
            <button className="btn" onClick={stop}>Stop</button>
          ) : (
            <button className="btn" onClick={start}>Camera</button>
          )}
          <form
            className="flex-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              lookup(code);
            }}
          >
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Or type/paste the barcode" className="input mono flex-1" />
            <button className="btn btn-primary" disabled={busy}>{busy ? "…" : "Look up"}</button>
          </form>
        </div>
        {error && <div className="mt-3 text-sm text-[var(--bad)]">{error}</div>}
      </Card>

      <Card className="lg:col-span-2">
        {!result?.item ? (
          <div className="text-sm text-[var(--ink-mute)]">Scan or enter a code to see item details, adjust stock, or record a quick sale.</div>
        ) : (
          <div>
            <div className="label mb-1">{result.item.category}</div>
            <h2 className="serif text-2xl">{result.item.name}</h2>
            <div className="text-sm text-[var(--ink-soft)] mt-1">
              {[result.item.color, result.item.size, result.item.material].filter(Boolean).join(" · ")}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <Tile label="On hand" value={String(result.item.quantity)} />
              <Tile label="Price" value={dollars(result.item.price_cents)} />
              <Tile label="Cost" value={dollars(result.item.cost_cents)} />
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button className="btn" onClick={() => adjust(result.item!.id, -1)}>− Stock</button>
              <button className="btn" onClick={() => adjust(result.item!.id, +1)}>+ Stock</button>
              <button className="btn btn-primary" onClick={() => quickSell(result.item!.id)}>Quick sell</button>
              <Link className="btn btn-ghost ml-auto" href={`/inventory/${result.item.id}`}>Open detail →</Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line-soft)] p-3">
      <div className="label">{label}</div>
      <div className="serif text-2xl mt-1">{value}</div>
    </div>
  );
}
