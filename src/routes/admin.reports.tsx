import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { FileWarning, Plane, MapPin } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({ component: () => (
  <PageCard title="Reports Dashboard">
    <div className="grid sm:grid-cols-3 gap-4">
      {[
        { to: "/admin/reports/visa-expiry", label: "Visa Expiry Report", icon: Plane },
        { to: "/admin/reports/passport-expiry", label: "Passport Expiry Report", icon: FileWarning },
        { to: "/admin/reports/address-change", label: "Address Change Log", icon: MapPin },
      ].map((r) => (
        <Link key={r.to} to={r.to} className="block border border-slate-200 rounded-md p-5 bg-white hover:shadow-md transition-shadow">
          <r.icon className="w-8 h-8 text-blue-600" />
          <div className="mt-2 font-semibold">{r.label}</div>
          <div className="text-xs text-slate-500 mt-1">View report →</div>
        </Link>
      ))}
    </div>
  </PageCard>
)});
