import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { authApi } from "@/api/auth";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { homePath } from "@/utils/permissions";

export function ChangePasswordPage() {
  const { user, status, logout, completePasswordChange } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const forced = status === "password-change-required";

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    const nextErrors: Record<string, string> = {};
    if (!oldPassword) nextErrors.old_password = "Current password is required";
    if (newPassword.length < 8) nextErrors.new_password = "Must be at least 8 characters";
    if (confirmPassword !== newPassword) {
      nextErrors.confirm_password = "Passwords do not match";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      await completePasswordChange();
      toast.success("Password changed", "Your new password is now active.");
      navigate(homePath(user?.role ?? "MANAGER"), { replace: true });
    } catch (error) {
      if (getFieldErrors(error).new_password) {
        setErrors((current) => ({ ...current, new_password: getFieldErrors(error).new_password }));
      }
      setFormError(getApiErrorMessage(error, "Could not change the password."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-base font-bold text-white">
            H
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">HIS</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">
              Change password
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {forced && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              You must change your password before you can continue. This requirement was set
              by an administrator on your account.
            </div>
          )}
          <h1 className="text-lg font-semibold text-slate-900">Set a new password</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{user?.email}</span>
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              error={errors.old_password}
              required
              autoFocus
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={errors.new_password}
              hint="Minimum 8 characters."
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={errors.confirm_password}
              required
            />
            <Button type="submit" size="md" loading={submitting} className="w-full">
              Update password
            </Button>
          </form>

          {!forced && (
            <button
              onClick={handleLogout}
              className="mt-4 w-full text-center text-xs font-medium text-slate-500 transition hover:text-red-600"
            >
              Sign out instead
            </button>
          )}
          {forced && (
            <button
              onClick={handleLogout}
              className="mt-4 w-full text-center text-xs font-medium text-slate-500 transition hover:text-red-600"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
