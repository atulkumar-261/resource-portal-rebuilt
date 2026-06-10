import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { useAuth, useRMS } from "@/lib/store";
import heroCode from "@/assets/hero-code.jpg";
import { Menu, X, Lock } from "lucide-react";
import { DailyReportModal } from "@/components/shared/DailyReportModal";
import { toast } from "sonner";


const adminNav = [
  { to: "/admin", label: "DASHBOARD", exact: true },
  { to: "/admin/analytics", label: "ANALYTICS" },
  { to: "/admin/timesheets", label: "TIME SHEET" },
  { to: "/admin/clients", label: "CLIENTS" },
  { to: "/admin/projects", label: "PROJECTS" },
  { to: "/admin/resources", label: "RESOURCES" },
  { to: "/admin/resources/org-structure", label: "ORG STRUCTURE" },
  { to: "/admin/resources/workload", label: "WORKLOAD HEATMAP" },

  { to: "/admin/leaves", label: "LEAVE MANAGER" },
  { to: "/admin/reports", label: "REPORTS AUDIT" },
  { to: "/admin/productivity", label: "PRODUCTIVITY" },
  { to: "/admin/announcements", label: "ANNOUNCEMENTS" },
  { to: "/admin/payslips", label: "PAYSLIPS" },
  { to: "/admin/tasks", label: "TASK UPDATES" },
];

const superAdminNav = [
  { to: "/admin/system-admins", label: "SYSTEM ADMINS" },
];

const userNav = [
  { to: "/user", label: "DASHBOARD", exact: true },
  { to: "/user/timesheets", label: "TIME SHEET" },
  { to: "/user/leaves", label: "MANAGE LEAVES" },
  { to: "/user/tasks", label: "TASK UPDATES" },
  { to: "/user/reports", label: "MY REPORTS" },
  { to: "/user/calendar", label: "MY CALENDAR" },
  { to: "/user/payslips", label: "PAYSLIPS" },
  { to: "/user/announcements", label: "ANNOUNCEMENTS" },
];

export function AppShell({ role, children }: { role: "admin" | "user"; children: ReactNode }) {
  const { role: authRole, userName, logout, onboardingStatus, token } = useAuth();
  const initStore = useRMS((s) => s.initStore);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = role === "admin" ? (authRole === "super_admin" ? [...adminNav, ...superAdminNav] : adminNav) : userNav;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Route lock: if resource user has pending onboarding, force them to profile
  const isOnboardingLocked = role === "user" && onboardingStatus === "pending";

  useEffect(() => {
    if (token) {
      initStore();
    }
  }, [token, initStore]);

  useEffect(() => {
    if (isOnboardingLocked && pathname !== "/user/profile") {
      toast("Please complete your profile before accessing other sections.", { icon: "🔒" });
      router.navigate({ to: "/user/profile" });
    }
  }, [isOnboardingLocked, pathname]);

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  const isActive = (n: { to: string; exact?: boolean }) => {
    if (n.exact) return pathname === n.to;
    if (pathname === n.to) return true;
    if (pathname.startsWith(n.to + "/")) {
      const hasLongerMatch = nav.some(
        (other) =>
          other.to !== n.to &&
          pathname.startsWith(other.to) &&
          other.to.length > n.to.length
      );
      return !hasLongerMatch;
    }
    return false;
  };


  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      {/* ── Top title bar ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            to={role === "admin" ? "/admin" : "/user"}
            className="flex items-center gap-2 min-w-0"
          >
            <BrandMark />
            <span className="text-lg sm:text-2xl font-semibold italic text-slate-700 tracking-tight truncate">
              Magnific
            </span>
          </Link>

          {/* Right side: user info + hamburger */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-slate-600 mb-0.5">
                Welcome{" "}
                <span className="text-[#2a8f8f]">
                  {userName || (role === "admin" ? "Admin" : "User")}
                </span>
                <span className="mx-1 text-slate-500 font-medium">|</span>
                <Link
                  to={role === "admin" ? "/admin/profile" : "/user/profile"}
                  className="text-[#2a8f8f] hover:underline"
                >
                  {role === "admin" ? "Profile" : "My Account"}
                </Link>
                <span className="mx-1 text-slate-500 font-medium">|</span>
                <button onClick={handleLogout} className="text-[#2a8f8f] hover:underline">
                  Logout
                </button>
                {role === "user" && (
                  <>
                    <span className="mx-1 text-slate-500 font-medium">|</span>
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="text-amber-600 font-extrabold hover:underline"
                    >
                      Log Daily Work
                    </button>
                  </>
                )}
              </div>
              <div className="text-2xl font-semibold text-slate-700">Resource Management</div>
            </div>
            {/* Mobile: title + hamburger */}
            <div className="sm:hidden flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Resource Mgmt</span>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop nav strip (horizontal scroll on medium screens) ── */}
      <nav className="bg-[#2f8f8f] border-t border-b border-[#247373] hidden sm:block">
        <div className="max-w-[1100px] mx-auto px-4 overflow-x-auto scrollbar-none">
          <div className="flex min-w-max flex-nowrap">
            {nav.map((n) => {
              const locked = isOnboardingLocked && n.to !== "/user/profile";
              return (
                <Link
                  key={n.to}
                  to={locked ? "/user/profile" : n.to}
                  onClick={(e) => {
                    if (locked) {
                      e.preventDefault();
                      toast("Complete your profile to unlock this section.", { icon: "🔒" });
                      router.navigate({ to: "/user/profile" });
                    }
                  }}
                  className={`px-3 py-2.5 text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap flex items-center gap-1 ${
                    locked
                      ? "text-white/40 cursor-not-allowed"
                      : isActive(n)
                        ? "bg-slate-700 text-white"
                        : "text-white/95 hover:bg-[#247373]"
                  }`}
                >
                  {locked && <Lock className="w-3 h-3" />}
                  {n.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="px-3 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-white/95 hover:bg-[#247373] whitespace-nowrap"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div className="sm:hidden bg-[#2f8f8f] border-b border-[#247373] z-50">
          <div className="flex flex-col">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMenuOpen(false)}
                className={`px-5 py-3 text-[12px] font-semibold tracking-wider uppercase border-b border-[#247373]/40 ${
                  isActive(n) ? "bg-slate-700 text-white" : "text-white hover:bg-[#247373]"
                }`}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to={role === "admin" ? "/admin/profile" : "/user/profile"}
              onClick={() => setMenuOpen(false)}
              className="px-5 py-3 text-[12px] font-semibold tracking-wider uppercase text-white hover:bg-[#247373] border-b border-[#247373]/40"
            >
              PROFILE
            </Link>
            <button
              onClick={handleLogout}
              className="px-5 py-3 text-[12px] font-semibold tracking-wider uppercase text-white hover:bg-[#247373] text-left"
            >
              LOGOUT
            </button>
          </div>
        </div>
      )}

      {/* ── Hero banner ── */}
      <div
        className="w-full h-[60px] sm:h-[140px] bg-cover bg-center flex-shrink-0"
        style={{ backgroundImage: `url(${heroCode})` }}
        aria-hidden="true"
      />

      {/* ── Page content ── */}
      <main className="flex-1 bg-white min-w-0 overflow-x-hidden">
        <div className="max-w-[1100px] mx-auto px-3 sm:px-6 py-4 sm:py-8">{children}</div>
      </main>

      <footer className="bg-[#2f8f8f] text-white text-center text-xs py-4">
        © 2026 All rights reserved MAGNIFIC IT
      </footer>
      <DailyReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
      <span className="absolute left-0 bottom-0 w-4 h-4 sm:w-5 sm:h-5 bg-[#e53935] rotate-12 rounded-sm shadow" />
      <span className="absolute left-2 bottom-2.5 w-4 h-4 sm:w-5 sm:h-5 bg-[#1e88e5] rotate-12 rounded-sm shadow" />
      <span className="absolute left-4 bottom-5 w-4 h-4 sm:w-5 sm:h-5 bg-[#43a047] rotate-12 rounded-sm shadow" />
      <span className="absolute left-6 bottom-7 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#fb8c00] rotate-12 rounded-sm shadow" />
    </div>
  );
}

export function PageCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-300 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.06)] min-w-0">
      <header className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <h1 className="text-base sm:text-lg font-semibold text-[#2a8f8f]">{title}</h1>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </header>
      <div className="p-4 sm:p-5 overflow-x-auto">{children}</div>
    </section>
  );
}
