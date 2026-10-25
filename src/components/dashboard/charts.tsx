"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function Bars({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  if (data.length === 0) return <p className="empty">Sin datos.</p>;
  return (
    <div className="panel" style={{ height: 260 }}>
      <h3 className="display" style={{ fontSize: "1.2rem" }}>
        {label}
      </h3>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#f6f1e7" tick={{ fontSize: 12 }} interval={0} hide={data.length > 5} />
          <YAxis stroke="#f6f1e7" width={40} />
          <Tooltip />
          <Bar dataKey="value" fill="#e10600" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
