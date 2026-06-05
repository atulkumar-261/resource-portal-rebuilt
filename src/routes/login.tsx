import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useRMS } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Magnific IT" },
      { name: "description", content: "Sign in to Magnific IT Resource Management." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const resources = useRMS((s) => s.resources);
  const [email, setEmail] = useState("admin@magnificit.co.uk");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState<"admin" | "user">("admin");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "admin") {
      login("admin", "Admin");
      router.navigate({ to: "/admin" });
    } else {
      const r = resources[0];
      login("user", r.fullName, r.id);
      router.navigate({ to: "/user" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden grid md:grid-cols-2 border border-slate-200">
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
          <div>
            <div className="w-14 h-14 rounded-md bg-white/15 flex items-center justify-center font-bold text-2xl mb-6">
              M
            </div>
            <h1 className="text-3xl font-bold leading-tight">Magnific IT</h1>
            <p className="text-blue-100 mt-1">Resource Management System</p>
          </div>
          <div>
            <p className="text-sm text-blue-100 leading-relaxed">
              Manage resources, projects, timesheets, leaves, payslips and announcements — all in
              one place.
            </p>
            <p className="text-xs text-blue-200/80 mt-6">© 2026 All rights reserved MAGNIFIC IT</p>
          </div>
        </div>
        <div className="p-8 md:p-10">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to continue</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Role</Label>
              <div className="flex gap-4 mt-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={role === "admin"}
                    onChange={() => setRole("admin")}
                  />{" "}
                  Admin
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={role === "user"} onChange={() => setRole("user")} />{" "}
                  Resource
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Demo: pick Admin or Resource and sign in.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
