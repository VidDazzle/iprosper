"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const PALETTE = ["#22d3ee", "#8b5cf6", "#34d399", "#fbbf24", "#fb7185", "#38bdf8", "#818cf8", "#f472b6"];

const AXIS = { stroke: "#64748b", fontSize: 12 };
const GRID = "#1e293b";
const tooltipStyle = {
  background: "#0b1220",
  border: "1px solid #1e293b",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

const fmtK = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`);

export function BarChartCard({
  data,
  xKey,
  bars,
  money = false,
  height = 260,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; name: string; color: string }[];
  money?: boolean;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: money ? 8 : -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={money ? fmtK : undefined} width={money ? 48 : 32} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} formatter={money ? (v: number) => fmtK(v) : undefined} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />}
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[4, 4, 0, 0]} maxBarSize={48} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineChartCard({
  data,
  xKey,
  lines,
  money = false,
  height = 260,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; name: string; color: string }[];
  money?: boolean;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: money ? 8 : -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={money ? fmtK : undefined} width={money ? 48 : 32} />
        <Tooltip contentStyle={tooltipStyle} formatter={money ? (v: number) => fmtK(v) : undefined} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaChartCard({
  data,
  xKey,
  areas,
  money = false,
  height = 260,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  areas: { key: string; name: string; color: string }[];
  money?: boolean;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: money ? 8 : -16 }}>
        <defs>
          {areas.map((a) => (
            <linearGradient key={a.key} id={`grad-${a.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={a.color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={a.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={money ? fmtK : undefined} width={money ? 48 : 32} />
        <Tooltip contentStyle={tooltipStyle} formatter={money ? (v: number) => fmtK(v) : undefined} />
        {areas.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {areas.map((a) => (
          <Area key={a.key} type="monotone" dataKey={a.key} name={a.name} stroke={a.color} strokeWidth={2} fill={`url(#grad-${a.key})`} stackId="1" />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChartCard({
  data,
  nameKey,
  valueKey,
  money = false,
  height = 260,
}: {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  money?: boolean;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={money ? (v: number) => fmtK(v) : undefined} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
