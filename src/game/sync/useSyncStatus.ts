import { useEffect, useState } from "react";
import { flushQueue, readMeta, readQueue, SYNC_CHANGED, type SyncMeta } from "./queue";

export interface SyncStatus extends SyncMeta {
  pending: number;
  online: boolean;
}

function snapshot(): SyncStatus {
  return { ...readMeta(), pending: readQueue().length, online: navigator.onLine };
}

/** Live queue size and last-sync time. Mounting it anywhere also keeps the queue flowing. */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState(snapshot);

  useEffect(() => {
    const refresh = () => setStatus(snapshot());
    const online = () => {
      refresh();
      void flushQueue();
    };
    window.addEventListener(SYNC_CHANGED, refresh);
    window.addEventListener("online", online);
    window.addEventListener("offline", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SYNC_CHANGED, refresh);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return status;
}

/** Background uploader — mounted once at the app root. */
export function useSyncLoop() {
  useEffect(() => {
    void flushQueue();
    const id = window.setInterval(() => void flushQueue(), 8000);
    const soon = () => window.setTimeout(() => void flushQueue(), 1500);
    window.addEventListener("online", soon);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", soon);
    };
  }, []);
}
