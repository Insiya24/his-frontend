import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { homePath } from "@/utils/permissions";
import { EmptyState } from "@/components/ui/States";
import { IconInbox } from "@/components/icons";

export function NotFoundPage() {
  const { user, status } = useAuth();
  const backTo =
    status === "authenticated" && user ? homePath(user.role) : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          icon={<IconInbox className="h-6 w-6" />}
          title="Page not found"
          description="The page you are looking for does not exist or you do not have access to it."
          action={
            <Link
              to={backTo}
              className="inline-flex items-center rounded-md bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              Go to dashboard
            </Link>
          }
        />
      </div>
    </div>
  );
}
