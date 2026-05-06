"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dollars } from "@/lib/format";

export default function EmployeeManager({ accountId, initial, defaultStipend }: { accountId: number; initial: any[]; defaultStipend: number }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState({ name: "", email: "", phone: "", role: "" });
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const r = await fetch(`/api/corporate/${accountId}/employees`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...n, stipend_balance_cents: defaultStipend }),
    });
    setBusy(false);
    if (r.ok) { setAdding(false); setN({ name: "", email: "", phone: "", role: "" }); router.refresh(); }
  }

  async function remove(id: number) {
    if (!confirm("Remove employee?")) return;
    await fetch(`/api/corporate/${accountId}/employees/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function reset(id: number) {
    await fetch(`/api/corporate/${accountId}/employees/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stipend_balance_cents: defaultStipend }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <table className="table">
        <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th className="text-right">Balance</th><th></th></tr></thead>
        <tbody>
          {initial.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.role || "—"}</td>
              <td>{e.email || "—"}</td>
              <td>{e.phone || "—"}</td>
              <td className="text-right mono">{dollars(e.stipend_balance_cents)}</td>
              <td className="text-right space-x-1">
                <button className="btn text-xs" onClick={() => reset(e.id)}>Reset stipend</button>
                <button className="btn btn-danger text-xs" onClick={() => remove(e.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {adding ? (
        <div className="rounded-lg border border-[var(--line-soft)] p-3 grid md:grid-cols-5 gap-2">
          <input className="input" placeholder="Name" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <input className="input" placeholder="Role" value={n.role} onChange={(e) => setN({ ...n, role: e.target.value })} />
          <input className="input" placeholder="Email" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} />
          <input className="input" placeholder="Phone" value={n.phone} onChange={(e) => setN({ ...n, phone: e.target.value })} />
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button disabled={busy} className="btn btn-primary" onClick={add}>{busy ? "…" : "Add"}</button>
          </div>
        </div>
      ) : (
        <button className="btn" onClick={() => setAdding(true)}>+ Add employee</button>
      )}
    </div>
  );
}
