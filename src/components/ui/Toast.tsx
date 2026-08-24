import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconAlertTriangle, IconCheck, IconX } from "@/components/icons";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastKind, { bar: string; icon: ReactNode }> = {
  success: {
    bar: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <IconCheck className="h-4 w-4 text-emerald-600" />,
  },
  error: {
    bar: "border-red-200 bg-red-50 text-red-800",
    icon: <IconAlertTriangle className="h-4 w-4 text-red-600" />,
  },
  info: {
    bar: "border-brand-200 bg-brand-50 text-brand-800",
    icon: <IconCheck className="h-4 w-4 text-brand-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, title: string, description?: string) => {
    const id = ++counter.current;
    setToasts((current) => [...current.slice(-4), { id, kind, title, description }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const value: ToastContextValue = {
    success: (title, description) => push("success", title, description),
    error: (title, description) => push("error", title, description),
    info: (title, description) => push("info", title, description),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-scale-in pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3 shadow-lg ${STYLES[toast.kind].bar}`}
          >
            <span className="mt-0.5 shrink-0">{STYLES[toast.kind].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 break-words text-xs opacity-80">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
              aria-label="Dismiss"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
