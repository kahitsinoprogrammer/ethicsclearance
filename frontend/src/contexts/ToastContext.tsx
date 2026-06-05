import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type Toast = {
  id: number;
  message: string;
  title: string;
  type: "success";
};

type ToastContextValue = {
  success: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  const success = useCallback(
    (message: string, title = "Success") => {
      const id = Date.now();

      setToasts((currentToasts) => [
        ...currentToasts,
        {
          id,
          message,
          title,
          type: "success"
        }
      ]);

      window.setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ success }), [success]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex gap-3 rounded-lg border bg-white p-4 text-left shadow-xl"
            role="status"
          >
            <div className="mt-0.5 text-pup-maroon">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">
                {toast.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {toast.message}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeToast(toast.id)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Dismiss notification</span>
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
