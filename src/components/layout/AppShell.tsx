import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/store";
import heroCode from "@/assets/hero-code.jpg";

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
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      {/* Top white title bar */}
      <div className="bg-white">
        <div className="max-w-[1100px] mx-auto px-6 pt-4 pb-3 flex items-end justify-between">
          <Link to={role === "admin" ? "/admin" : "/user"} className="flex items-center gap-3">
            <BrandMark />
            <span className="text-2xl font-semibold italic text-slate-700 tracking-tight">Magnific</span>
          </Link>
          <div className="text-right">
            <div className="text-[11px] text-slate-600 mb-1">
              Welcome <span className="text-[#2a8f8f]">{userName || (role === "admin" ? "Admin" : "User")}</span>
              <span className="mx-1 text-slate-400">|</span>
              <Link to={role === "admin" ? "/admin/profile" : "/user/profile"} className="text-[#2a8f8f] hover:underline">{role === "admin" ? "Profile" : "My Account"}</Link>
              <span className="mx-1 text-slate-400">|</span>
              <button onClick={handleLogout} className="text-[#2a8f8f] hover:underline">Logout</button>
            </div>
            <div className="text-2xl font-semibold text-slate-700">Resource Management</div>
          </div>
        </div>
      </div>
      {/* Teal nav strip */}
      <nav className="bg-[#2f8f8f] border-t border-b border-[#247373]">
        <div className="max-w-[1100px] mx-auto px-4 flex flex-wrap">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2.5 text-[11px] font-semibold tracking-wider uppercase ${active ? "bg-slate-700 text-white" : "text-white/95 hover:bg-[#247373]"}`}
              >
                {n.label}
              </Link>
            );
          })}
          <button onClick={handleLogout} className="px-3 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-white/95 hover:bg-[#247373]">
            LOGOUT
          </button>
        </div>
      </nav>
      {/* Hero code banner */}
      <div
        className="w-full h-[140px] bg-cover bg-center"
        style={{ backgroundImage: `url(${heroCode})` }}
        aria-hidden="true"
      />
      <main className="flex-1 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-8">{children}</div>
      </main>
      <footer className="bg-[#2f8f8f] text-white text-center text-xs py-4">
        © 2026 All rights reserved MAGNIFIC IT
      </footer>
    </div>
  );
}

function BrandMark() {
  // Stacked colored cubes evoking the legacy Magnific "M" logo
  return (
    <div className="relative w-12 h-12">
      <span className="absolute left-0 bottom-0 w-5 h-5 bg-[#e53935] rotate-12 rounded-sm shadow" />
      <span className="absolute left-2.5 bottom-3 w-5 h-5 bg-[#1e88e5] rotate-12 rounded-sm shadow" />
      <span className="absolute left-5 bottom-6 w-5 h-5 bg-[#43a047] rotate-12 rounded-sm shadow" />
      <span className="absolute left-7 bottom-9 w-4 h-4 bg-[#fb8c00] rotate-12 rounded-sm shadow" />
    </div>
  );
}

export function PageCard({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white border border-slate-300 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <header className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#2a8f8f]">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
