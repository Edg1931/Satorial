"use client";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

export default function CashFlowChart({ data }: { data: Array<{ d: string; in_: number; out: number; net: number }> }) {
  let cum = 0;
  const chart = data.map((r) => {
    cum += r.net;
    return { d: r.d.slice(5), inflow: r.in_ / 100, outflow: -r.out / 100, cumulative: cum / 100 };
  });
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="#20232c" strokeDasharray="3 3" />
          <XAxis dataKey="d" stroke="#7c7768" fontSize={11} />
          <YAxis stroke="#7c7768" fontSize={11} tickFormatter={(v) => `$${v.toFixed(0)}`} />
          <Tooltip contentStyle={{ background: "#14161d", border: "1px solid #2a2e3a", borderRadius: 8, color: "#f3eee2" }} formatter={(v: any, n: any) => [`$${(v as number).toFixed(2)}`, n]} />
          <ReferenceLine y={0} stroke="#2a2e3a" />
          <Bar dataKey="inflow" fill="#7fb09b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outflow" fill="#df6a58" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="cumulative" stroke="#c69f5a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
