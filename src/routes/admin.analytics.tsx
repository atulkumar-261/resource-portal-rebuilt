import { createFileRoute } from "@tanstack/react-router";
import { useRMS } from "@/lib/store";
import { isResourceAssignable } from "@/lib/types";
import { PageCard } from "@/components/layout/AppShell";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({ component: AnalyticsPage });

// ── colour palettes ────────────────────────────────────────────────────────────
const TEAL = "#2a8f8f";
const PALETTE = ["#2a8f8f", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#f97316"];

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  "in-progress": "#3b82f6",
  completed: "#10b981",
  approved: "#10b981",
  rejected: "#ef4444",
  active: "#2a8f8f",
  "on-hold": "#f97316",
};

// ── helper ─────────────────────────────────────────────────────────────────────
function countBy<T>(arr: T[], key: (x: T) => string) {
  return Object.entries(
    arr.reduce<Record<string, number>>((acc, x) => {
      const k = key(x);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));
}

// ── custom tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="leading-6">
          <span className="font-medium">{p.name}:</span> {p.value}
        </p>
      ))}
    </div>
  );
}

// ── stat pill ──────────────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-slate-600">{label}</span>
      <span className="ml-auto text-xs font-bold text-slate-800">{value}</span>
    </div>
  );
}

// ── section wrapper ────────────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const { tasks, leaves, resources, timesheets, projects, payslips } = useRMS();

  // ── derived data ────────────────────────────────────────────────────────────
  const taskStatus = countBy(tasks, (t) => t.status);
  const leaveType = countBy(leaves, (l) => l.type);
  const leaveStatus = countBy(leaves, (l) => l.status);
  const projectStat = countBy(projects, (p) => p.status);

  // Job role breakdown (Active & Approved resources only)
  const activeResources = resources.filter(isResourceAssignable);
  const roleMap = activeResources.reduce<Record<string, number>>((acc, r) => {
    acc[r.jobTitle] = (acc[r.jobTitle] ?? 0) + 1;
    return acc;
  }, {});
  const roleData = Object.entries(roleMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Timesheet hours by week (sorted ascending)
  const timesheetData = [...timesheets]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((ts) => ({ week: `W${ts.weekNumber}`, hours: ts.totalHours }));

  // Payslip salary data
  const payslipData = payslips.map((p) => ({
    name: p.resourceName.split(" ")[0],
    amount: p.amount,
  }));

  // task by project
  const taskByProject = countBy(tasks, (t) => t.project);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Data-driven insights across your organisation
          </p>
        </div>
        <div className="flex gap-2 items-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Live data — {tasks.length + leaves.length + timesheets.length} records
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Resources",
            value: resources.length,
            color: TEAL,
            sub: "All tracked profiles",
          },
          {
            label: "Assignable Resources",
            value: resources.filter(isResourceAssignable).length,
            color: "#10b981",
            sub: "Active and compliant",
          },
          {
            label: "Pending Resources",
            value: resources.filter(r => r.status === "pending" || r.approvalStatus === "pending").length,
            color: "#f59e0b",
            sub: "Awaiting approval/onboarding",
          },
          {
            label: "Rejected Resources",
            value: resources.filter(r => r.approvalStatus === "rejected").length,
            color: "#ef4444",
            sub: "Onboarding rejected",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4"
          >
            <div className="text-3xl font-extrabold" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">{k.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1 — Tasks + Projects */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Task Status Donut */}
        <ChartCard title="Task Status Breakdown" subtitle="Distribution by current status">
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={taskStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {taskStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-2 py-2">
              {taskStatus.map((d) => (
                <StatPill
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  color={STATUS_COLORS[d.name] ?? "#94a3b8"}
                />
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Project Status Donut */}
        <ChartCard title="Project Status" subtitle="Active, on-hold & completed">
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={projectStat}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {projectStat.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-2 py-2">
              {projectStat.map((d) => (
                <StatPill
                  key={d.name}
                  label={d.name}
                  value={d.value}
                  color={STATUS_COLORS[d.name] ?? "#94a3b8"}
                />
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 2 — Timesheet area + Tasks by Project */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Timesheet Hours Area */}
        <ChartCard title="Weekly Timesheet Hours" subtitle="Approved hours logged per week">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timesheetData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TEAL} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 45]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="hours"
                name="Hours"
                stroke={TEAL}
                strokeWidth={2.5}
                fill="url(#tealGrad)"
                dot={{ r: 4, fill: TEAL, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tasks by Project Bar */}
        <ChartCard title="Tasks by Project" subtitle="Number of tasks allocated per project">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={taskByProject}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              barCategoryGap="35%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]}>
                {taskByProject.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3 — Resources by Role + Leave Type */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Resource Role Horizontal Bar */}
        <ChartCard title="Resources by Job Title" subtitle="Headcount per role">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={roleData}
              layout="vertical"
              margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={130}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]}>
                {roleData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Leave Type + Status stacked bars */}
        <ChartCard title="Leave Requests" subtitle="Count by type and approval status">
          <div className="grid grid-cols-2 gap-4 h-[220px]">
            {/* By Type */}
            <div className="flex flex-col h-full">
              <p className="text-[11px] font-medium text-slate-500 mb-2">By Type</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leaveType}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
                    {leaveType.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* By Status */}
            <div className="flex flex-col h-full">
              <p className="text-[11px] font-medium text-slate-500 mb-2">By Status</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leaveStatus}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
                    {leaveStatus.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4 — Payslips */}
      <ChartCard
        title="Payslip Amounts"
        subtitle="Monthly salary paid per resource (most recent payroll)"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={payslipData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            barCategoryGap="40%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `£${(v as number).toLocaleString()}`}
            />
            <Tooltip
              formatter={(value) => [`£${(value as number).toLocaleString()}`, "Salary"]}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-700 mb-1">{label}</p>
                    <p style={{ color: TEAL }}>
                      Salary: £{(payload[0].value as number).toLocaleString()}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="amount" name="Salary" radius={[8, 8, 0, 0]}>
              {payslipData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
