"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, Link2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DEFAULT_INTERVAL_MS = 15_000;
const NOTIFICATION_INTERVAL_MS = 5_000;
const TOAST_DURATION_MS = 5_500;
const NOTIFICATION_OVERLAP_MS = 2_000;

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

export function LiveTracking({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = React.useState<NotificationItem[]>([]);
  const timersRef = React.useRef<Record<string, number>>({});
  const latestSeenAtRef = React.useRef<string | null>(null);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const hydratedRef = React.useRef(false);
  const pollingRef = React.useRef(false);

  const removeToast = React.useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
    const timerId = timersRef.current[toastId];
    if (timerId) {
      window.clearTimeout(timerId);
      delete timersRef.current[toastId];
    }
  }, []);

  const pushToast = React.useCallback(
    (notification: NotificationItem) => {
      setToasts((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }
        return [notification, ...current].slice(0, 4);
      });
      if (timersRef.current[notification.id]) {
        window.clearTimeout(timersRef.current[notification.id]);
      }
      timersRef.current[notification.id] = window.setTimeout(() => {
        removeToast(notification.id);
      }, TOAST_DURATION_MS);
    },
    [removeToast]
  );

  React.useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      timersRef.current = {};
    };
  }, []);

  React.useEffect(() => {
    let stopped = false;

    const pollNotifications = async () => {
      if (stopped || pollingRef.current) {
        return;
      }

      if (document.visibilityState !== "visible") {
        return;
      }

      if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
        return;
      }

      pollingRef.current = true;
      try {
        const params = new URLSearchParams({ limit: "20" });

        if (latestSeenAtRef.current) {
          const sinceDate = new Date(
            new Date(latestSeenAtRef.current).getTime() - NOTIFICATION_OVERLAP_MS
          );
          if (!Number.isNaN(sinceDate.getTime())) {
            params.set("since", sinceDate.toISOString());
          }
        }

        const response = await fetch(`/api/notifications?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as NotificationResponse;
        const incoming = Array.isArray(payload.notifications)
          ? payload.notifications
          : [];
        if (incoming.length === 0) {
          hydratedRef.current = true;
          return;
        }

        const sorted = [...incoming].sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        );

        let hasNewNotification = false;
        for (const notification of sorted) {
          const alreadySeen = seenIdsRef.current.has(notification.id);
          seenIdsRef.current.add(notification.id);

          if (!alreadySeen && hydratedRef.current) {
            hasNewNotification = true;
            pushToast(notification);
          }
        }

        const latestIncoming = incoming[0]?.createdAt;
        if (latestIncoming) {
          if (!latestSeenAtRef.current) {
            latestSeenAtRef.current = latestIncoming;
          } else if (
            new Date(latestIncoming).getTime() > new Date(latestSeenAtRef.current).getTime()
          ) {
            latestSeenAtRef.current = latestIncoming;
          }
        }

        hydratedRef.current = true;

        if (hasNewNotification) {
          router.refresh();
        }
      } catch {
        // Ignore polling errors. The next poll retries automatically.
      } finally {
        pollingRef.current = false;
      }
    };

    void pollNotifications();
    const intervalId = window.setInterval(() => {
      void pollNotifications();
    }, NOTIFICATION_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [pathname, pushToast, router]);

  React.useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
        return;
      }
      router.refresh();
    };

    const intervalId = window.setInterval(refresh, intervalMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, intervalMs, pathname]);

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[90] flex w-[min(360px,calc(100vw-1.5rem))] flex-col gap-2 sm:left-4 sm:top-4 md:left-[calc(16rem+1rem)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-auto rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur",
            "ring-1 ring-border/70"
          )}
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-semibold text-foreground">
                {toast.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {toast.message}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/90">
                <Link2 className="h-3.5 w-3.5" />
                <span>
                  {new Date(toast.createdAt).toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link href="/portal/notifications">Open</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary/60"
              style={{ animation: `ayra-toast-progress ${TOAST_DURATION_MS}ms linear forwards` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
