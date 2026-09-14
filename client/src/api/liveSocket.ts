import { useEffect, useRef, useState } from "react";
import { OrgNodePatchSchema, type OrgNodePatch } from "@/api/schema";

export type ConnectionStatus = "connecting" | "open" | "reconnecting";

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

function backoffDelay(attempt: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return exp + Math.random() * 300; // jitter, avoids reconnect storms
}

// Owns the WebSocket connection to /ws and exposes only a status + a patch
// callback — it never touches the tree/aggregate model itself.
export function useOrgTreeLiveSocket(onPatch: (patch: OrgNodePatch) => void): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const onPatchRef = useRef(onPatch);

  useEffect(() => {
    onPatchRef.current = onPatch;
  }, [onPatch]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let cancelled = false;

    function connect(): void {
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

      socket.addEventListener("open", () => {
        attempt = 0;
        setStatus("open");
      });

      socket.addEventListener("message", (event) => {
        let json: unknown;
        try {
          json = JSON.parse(event.data as string);
        } catch {
          return; // malformed frame — ignore rather than crash the socket handler
        }
        const parsed = OrgNodePatchSchema.safeParse(json);
        if (parsed.success) {
          onPatchRef.current(parsed.data);
        }
      });

      socket.addEventListener("close", () => {
        if (cancelled) return;
        setStatus("reconnecting");
        const delay = backoffDelay(attempt);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  return status;
}
