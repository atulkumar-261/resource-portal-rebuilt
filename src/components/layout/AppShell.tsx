import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/store";

const adminNav = [
  { to: "/admin", label: "DASHBOARD", exact: true },
  { to: "/admin/timesheets", label: "TIME SHEET" },
  { to: "/admin/clients", label: "CLIENTS" },
  { to: "/admin/projects", label: "PROJECTS" },
  { to: "/admin/resources", label: "RESOURCES" },
  { to: "/admin/leaves", label: "LEAVE MANAGER" },
  { to: "/admin/reports", label: "REPORTS" },
  { to: "/admin/announcements", label: "ANNOUNCEMENTS" },
  { to: "/admin/payslips", label: "PAYSLIPS" },
  { to: "/admin/tasks", label: "TASK UPDATES" },
];

const userNav = [
  { to: "/user", label: "DASHBOARD", exact: true },
  { to: "/user/timesheets", label: "TIME SHEET" },
  { to: "/user/leaves", label: "MANAGE LEAVES" },
  { to: "/user/tasks", label: "TASK UPDATES" },
  { to: "/user/payslips", label: "PAYSLIPS" },
  { to: "/user/announcements", label: "ANNOUNCEMENTS" },
];

export function AppShell({ role, children }: { role: "admin" | "user"; children: ReactNode }) {
  const { userName, logout } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = role === "admin" ? adminNav : userNav;

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-800">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link to={role === "admin" ? "/admin" : "/user"} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow">M</div>
            <div className="leading-tight">
              <div className="font-bold text-slate-900">Magnific</div>
              <div className="text-xs text-slate-500 -mt-0.5">Resource Management</div>
            </div>
          </Link>
          <div className="text-sm text-slate-600 flex items-center gap-3">
            <span>Welcome <strong>{userName || (role === "admin" ? "Admin" : "User")}</strong></span>
            <span className="text-slate-300">|</span>
            <Link to={role === "admin" ? "/admin/profile" : "/user/profile"} className="text-blue-700 hover:underline">{role === "admin" ? "Profile" : "My Account"}</Link>
            <span className="text-slate-300">|</span>
            <button onClick={handleLogout} className="text-blue-700 hover:underline">Logout</button>
          </div>
        </div>
        <nav className="bg-slate-800">
          <div className="max-w-[1400px] mx-auto px-4 flex flex-wrap">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/");
              return (
                <Link key={n.to} to={n.to} className={`px-4 py-3 text-xs font-semibold tracking-wide border-r border-slate-700 ${active ? "bg-blue-700 text-white" : "text-slate-200 hover:bg-slate-700"}`}>
                  {n.label}
                </Link>
              );
            })}
            <button onClick={handleLogout} className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-200 hover:bg-slate-700 ml-auto">LOGOUT</button>
          </div>
        </nav>
      </header>
      <main className="max-w-[1400px] mx-auto px-6 py-6">{children}</main>
      <footer className="text-center text-xs text-slate-500 py-6">© 2026 All rights reserved MAGNIFIC IT</footer>
    </div>
  );
}

export function PageCard({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-md shadow-sm">
      <header className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-md">
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
