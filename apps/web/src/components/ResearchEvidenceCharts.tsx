"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const renewableGrowthData = [
  { name: "Today", capacity: 1 },
  { name: "2030", capacity: 2.7 },
];

const solarCostData = [
  { name: "2010", costIndex: 100 },
  { name: "2024", costIndex: 13 },
];

const kazakhstanSolarData = [
  { name: "North", factor: 13 },
  { name: "South", factor: 18 },
];

const chartPalette = ["#9945FF", "var(--accent-green-ui)"];

function TooltipCard({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | string; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border px-3 py-2 text-xs shadow-xl"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p className="font-black">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="mt-1" style={{ color: "var(--text-muted)" }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

export function ResearchEvidenceCharts() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div
        className="rounded-[30px] border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-4">
          <p className="label-xs">IEA Renewables 2024</p>
          <h3 className="mt-2 text-xl font-black">Renewable capacity is projected to reach 2.7x</h3>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
            This is the macro proof that the underlying asset class is scaling structurally rather
            than behaving like a niche experiment.
          </p>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={renewableGrowthData}
              margin={{ top: 10, right: 0, left: -24, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(127,127,127,0.12)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8a8c8c", fontSize: 12 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8a8c8c", fontSize: 12 }} />
              <Tooltip content={<TooltipCard />} />
              <Bar dataKey="capacity" name="Capacity multiple" radius={[10, 10, 0, 0]}>
                {renewableGrowthData.map((entry, index) => (
                  <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="rounded-[30px] border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-4">
          <p className="label-xs">IRENA 2025 Cost Report</p>
          <h3 className="mt-2 text-xl font-black">Utility-scale solar cost index dropped to 13</h3>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
            The research cites solar PV installed costs in 2024 as 87% lower than in 2010. That is
            direct evidence that smaller projects are more financeable than before.
          </p>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={solarCostData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(127,127,127,0.12)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8a8c8c", fontSize: 12 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8a8c8c", fontSize: 12 }} />
              <Tooltip content={<TooltipCard />} />
              <Line
                type="monotone"
                dataKey="costIndex"
                name="Installed cost index"
                stroke="var(--accent-green-ui)"
                strokeWidth={3}
                dot={{ r: 5, fill: "var(--accent-green-ui)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="rounded-[30px] border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-4">
          <p className="label-xs">Kazakhstan resource study</p>
          <h3 className="mt-2 text-xl font-black">
            Southern Kazakhstan materially outperforms the north
          </h3>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
            The cited range is roughly 13% to 18% solar capacity factor. That is why the first
            pipeline should be region-specific rather than market-wide.
          </p>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={kazakhstanSolarData}
              margin={{ top: 10, right: 0, left: -24, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="rgba(127,127,127,0.12)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8a8c8c", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8a8c8c", fontSize: 12 }}
                unit="%"
              />
              <Tooltip content={<TooltipCard />} />
              <Bar dataKey="factor" name="Capacity factor %" radius={[10, 10, 0, 0]}>
                {kazakhstanSolarData.map((entry, index) => (
                  <Cell key={entry.name} fill={chartPalette[(index + 1) % chartPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
