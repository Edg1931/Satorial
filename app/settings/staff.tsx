"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Staff } from "@/lib/types";
import { Chip } from "@/components/ui";

const ROLES = ["owner", "manager", "sales", "tailor"];

export default function StaffManager({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState({ name: "", email: "", phone: "", role: "sales", pin: "" });
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const r = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(n) });
    setBusy(false);
    if (r.ok) { setAdding(false); setN({ name: "", email: "", phone: "", role: "sales", pin: "" }); router.refresh(); }
  }

  async function toggle(s: Staff) {
    await fetch(`/api/staff/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: s.active ? 0 : 1 }) });
    router.refresh();
  }

  async function remove(s: Staff) {
    if (!confirm(`Remove ${s.name}?`)) return;
    await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>PIN</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.email || "—"}</td>
              <td>{s.phone || "—"}</td>
              <td><Chip tone={s.role === "owner" ? "accent" : undefined}>{s.role}</Chip></td>
              <td className="mono">{s.pin || "—"}</td>
              <td>{s.active ? <Chip tone="good">Active</Chip> : <Chip>Off</Chip>}</td>
              <td className="text-right space-x-1">
                <button className="btn text-xs" onClick={() => toggle(s)}>{s.active ? "Deactivate" : "Activate"}</button>
                {s.role !== "owner" && <button className="btn btn-danger text-xs" onClick={() => remove(s)}>Remove</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {adding ? (
        <div className="rounded-lg border border-[var(--line-soft)] p-3 grid md:grid-cols-5 gap-2">
          <input className="input" placeholder="Name" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <input className="input" placeholder="Email" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} />
          <input className="input" placeholder="Phone" value={n.phone} onChange={(e) => setN({ ...n, phone: e.target.value })} />
          <select className="select" value={n.role} onChange={(e) => setN({ ...n, role: e.target.value })}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input className="input mono" placeholder="4-digit PIN" maxLength={4} value={n.pin} onChange={(e) => setN({ ...n, pin: e.target.value.replace(/\D/g, "") })} />
          <div className="md:col-span-5 flex justify-end gap-2">
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button disabled={busy} className="btn btn-primary" onClick={add}>{busy ? "…" : "Add"}</button>
          </div>
        </div>
      ) : (
        <button className="btn" onClick={() => setAdding(true)}>+ Add staff member</button>
      )}
    </div>
  );
}
