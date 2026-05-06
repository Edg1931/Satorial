"use client";
import { Card } from "@/components/ui";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Cell } from "recharts";

export default function FinanceCharts({
  daily,
  categories,
}: {
  daily: Array<{ d: string; rev: number }>;
  categories: Array<{ category: string; total: number }>;
}) {
  const dayData = daily.map((r) => ({ ...r, rev: r.rev / 100 }));
  const catData = categories.map((r) => ({ ...r, total: r.total / 100 }));
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card title="Revenue · 90d" className="lg:col-span-2">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dayData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
              <defs><linearGradient id="frev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7fb09b" stopOpacity={0.45} /><stop offset="100%" stopColor="#7fb09b" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#20232c" strokeDasharray="3 3" />
              <XAxis dataKey="d" tickFormatter={(v) => v.slice(5)} stroke="#7c7768" fontSize={11} />
              <YAxis stroke="#7c7768" fontSize={11} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: "#14161d", border: "1px solid #2a2e3a", borderRadius: 8, color: "#f3eee2" }} formatter={(v: any) => [`$${(v as number).toFixed(2)}`, "Revenue"]} />
              <Area type="monotone" dataKey="rev" stroke="#7fb09b" fill="url(#frev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Expenses by category · 90d">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="category" stroke="#b8b3a6" fontSize={12} width={120} />
              <Tooltip contentStyle={{ background: "#14161d", border: "1px solid #2a2e3a", borderRadius: 8, color: "#f3eee2" }} formatter={(v: any) => [`$${(v as number).toFixed(2)}`, "Total"]} />
              <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={["#cf8a72", "#c69f5a", "#a59ec2", "#9aa9c5", "#7fb09b", "#d4a07a"][i % 6]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
