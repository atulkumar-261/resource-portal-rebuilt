import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useRMS } from "@/lib/store";
import { toast } from "sonner";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const backendHost = window.location.hostname;
      const resp = await fetch(`http://${backendHost}:8000/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: email,
          password: password,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const userObj = data.user;
        const userRole = userObj.role === "super_admin" ? "super_admin" : userObj.role === "admin" ? "admin" : "user";
        
        let displayName = userObj.full_name || userObj.username;
        if (data.resource_id) {
          const resObj = resources.find((r) => r.id === data.resource_id);
          if (resObj) {
            displayName = resObj.fullName;
          }
        } else if ((userRole === "admin" || userRole === "super_admin") && !userObj.full_name) {
          displayName = "Admin";
        }
        
        login(userRole, displayName, data.resource_id || undefined, data.token, data.onboarding_status || undefined);
        toast.success(`Welcome back, ${displayName}!`);
        
        if (userRole === "admin" || userRole === "super_admin") {
          router.navigate({ to: "/admin" });
        } else if (data.onboarding_status === "pending") {
          toast("Please complete your profile to continue.", { icon: "⚠️" });
          router.navigate({ to: "/user/profile" });
        } else {
          router.navigate({ to: "/user" });
        }
      } else {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson.detail || "Invalid credentials.";
        toast.error(msg);
      }
    } catch (err) {
      console.error("Login failed:", err);
      toast.error("Could not connect to the backend server. Please verify it is running.");
    } finally {
      setLoading(false);
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
              <Label>Login ID</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. rahul.sharma@magnificit.com" required />
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Enter your registered Login ID and password to sign in.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
