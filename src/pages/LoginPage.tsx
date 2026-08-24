import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { getApiErrorMessage } from "@/utils/errors";
import { homePath } from "@/utils/permissions";

export function LoginPage() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (status === "password-change-required") {
    return <Navigate to="/change-password" replace />;
  }
  if (status === "authenticated" && user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? homePath(user.role)} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const nextFieldErrors: Record<string, string> = {};
    if (!email.trim()) nextFieldErrors.email = "Email is required";
    if (!password) nextFieldErrors.password = "Password is required";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.must_change_password || result.user.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from ?? homePath(result.user.role), { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-base font-bold text-white">
            H
          </span>
          <span className="text-lg font-bold text-white">HIS</span>
        </div>
        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-snug text-white">
            Salon chain operations, centralized.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Attendance, cleaning checklists, inventory, product requests, customer visits,
            complaints and inspections — managed per branch from one console.
          </p>
        </div>
        <p className="text-xs text-slate-600">Salon Chain Management SaaS</p>
      </div>

      {/* Login form */}
      <div className="flex w-full items-center justify-center bg-slate-100 px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-base font-bold text-white">
              H
            </span>
            <span className="text-lg font-bold text-slate-900">HIS</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use your HIS account credentials to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              required
            />
            <Button type="submit" size="md" loading={submitting} className="w-full">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
