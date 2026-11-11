"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function GraficoBarras({ dados, nome }: { dados: { nome: string; valor: number }[]; nome: string }) {
  if (dados.length === 0) return <p className="text-sm">Sem dados neste período.</p>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#173B6220" />
          <XAxis dataKey="nome" interval={0} angle={-25} textAnchor="end" height={60} tick={{ fontSize: 12, fill: "#173B62" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#173B62" }} width={32} />
          <Tooltip />
          <Bar dataKey="valor" name={nome} fill="#173B62" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
