"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "./Icon";

export type ToastStatus = "default" | "success" | "warning" | "error";
type ToastItem = { id: number; text: string; status: ToastStatus };

const icons: Record<Exclude<ToastStatus, "default">, IconName> = { success: "check", warning: "alert", error: "alert" };

const ToastContext = createContext<(text: string, status?: ToastStatus) => void>(() => {});

/** Shows a toast: `toast("Code copied", "success")`. Needs a <ToastProvider> above. */
export function useToast() {
  return useContext(ToastContext);
}

/**
 * One toast stack per area (design-system Toast): bottom centre, with a polite
 * and an assertive live region that are always mounted. Default and success
 * toasts leave after 4 seconds; errors stay until dismissed.
 */
export function ToastProvider({ dismissLabel, children }: { dismissLabel: string; children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((text: string, status: ToastStatus = "default") => {
    // One message at a time per kind keeps the stack short.
    setItems((all) => [...all.filter((t) => (t.status === "error") !== (status === "error")), { id: Date.now(), text, status }]);
  }, []);
  const value = useMemo(() => show, [show]);

  const polite = items.filter((t) => t.status !== "error");
  const errors = items.filter((t) => t.status === "error");

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="cc-toasts cc-toasts--fixed">
        <div aria-live="polite" className="contents">
          {polite.map((t) => (
            <Toast key={t.id} item={t} onDone={dismiss} />
          ))}
        </div>
        <div aria-live="assertive" className="contents">
          {errors.map((t) => (
            <Toast key={t.id} item={t} onDone={dismiss} dismissLabel={dismissLabel} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone, dismissLabel }: { item: ToastItem; onDone: (id: number) => void; dismissLabel?: string }) {
  useEffect(() => {
    if (item.status === "error") return;
    const timer = setTimeout(() => onDone(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item, onDone]);

  return (
    <div className={cn("cc-toast", item.status !== "default" && `cc-toast--${item.status}`)}>
      {item.status !== "default" && (
        <span className="cc-toast__icon" aria-hidden="true">
          <Icon name={icons[item.status]} />
        </span>
      )}
      <p className="cc-toast__body">{item.text}</p>
      {dismissLabel && (
        <div className="cc-toast__actions">
          <button
            type="button"
            className="cc-iconbtn cc-iconbtn--xs min-h-control min-w-control"
            aria-label={dismissLabel}
            title={dismissLabel}
            onClick={() => onDone(item.id)}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
