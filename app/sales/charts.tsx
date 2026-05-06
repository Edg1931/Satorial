"use client";
import { Card } from "@/components/ui";
import { dollars } from "@/lib/format";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Cell } from "recharts";

export default function SalesCharts({
  byDay,
  byCategory,
  bySize,
}: {
  byDay: Array<{ d: string; rev: number; orders: number }>;
  byCategory: Array<{ category: string; units: number; revenue: number }>;
  bySize: Array<{ category: string; size: string; units: number; revenue: number }>;
}) {
  const dayData = byDay.map((r) => ({ ...r, rev: r.rev / 100 }));
  const catData = byCategory.map((r) => ({ ...r, revenue: r.revenue / 100 }));

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card title="Daily revenue · 30d" className="lg:col-span-2">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dayData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c69f5a" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#c69f5a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#20232c" strokeDasharray="3 3" />
              <XAxis dataKey="d" tickFormatter={(v) => v.slice(5)} stroke="#7c7768" fontSize={11} />
              <YAxis stroke="#7c7768" fontSize={11} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: "#14161d", border: "1px solid #2a2e3a", borderRadius: 8, color: "#f3eee2" }}
                formatter={(v: any) => [`$${(v as number).toFixed(2)}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="rev" stroke="#c69f5a" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Revenue by category · 90d">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="category" stroke="#b8b3a6" fontSize={12} width={100} />
              <Tooltip
                contentStyle={{ background: "#14161d", border: "1px solid #2a2e3a", borderRadius: 8, color: "#f3eee2" }}
                formatter={(v: any) => [`$${(v as number).toFixed(2)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={["#c69f5a", "#9aa9c5", "#7fb09b", "#d4a07a", "#a59ec2", "#cf8a72"][i % 6]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top sizes · 90d" className="lg:col-span-3">
        <table className="table">
          <thead><tr><th>Category</th><th>Size</th><th>Units</th><th className="text-right">Revenue</th></tr></thead>
          <tbody>
            {bySize.map((r, i) => (
              <tr key={i}>
                <td>{r.category}</td>
                <td className="serif text-lg">{r.size}</td>
                <td>{r.units}</td>
                <td className="text-right">{dollars(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
