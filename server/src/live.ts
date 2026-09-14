import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { store } from "./data.js";
import type { OrgNode } from "./types.js";

export interface OrgNodePatch {
  type: "node-updated";
  id: string;
  changes: Partial<Pick<OrgNode, "headcount" | "budget" | "performance" | "updatedAt">>;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function mutateRandomNode(): OrgNodePatch {
  const node = store.nodes[Math.floor(Math.random() * store.nodes.length)];
  const field = Math.floor(Math.random() * 3);
  const timestamp = new Date().toISOString();
  const changes: OrgNodePatch["changes"] = { updatedAt: timestamp };

  if (field === 0) {
    node.headcount = Math.max(1, node.headcount + Math.round(randomInRange(-2, 3)));
    changes.headcount = node.headcount;
  } else if (field === 1) {
    node.budget = Math.max(0, Math.round(node.budget * (1 + randomInRange(-0.08, 0.08))));
    changes.budget = node.budget;
  } else {
    node.performance = Math.min(100, Math.max(0, Math.round(node.performance + randomInRange(-8, 8))));
    changes.performance = node.performance;
  }

  node.updatedAt = timestamp;
  return { type: "node-updated", id: node.id, changes };
}

// Mock "real-time activity": every ~2-5s, one random node's headcount, budget,
// or performance drifts slightly. Runs regardless of whether anyone is
// connected, so the store stays consistent with what a reconnecting client's
// GET /api/org-tree would see.
export function attachLiveUpdates(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
  });

  function broadcast(patch: OrgNodePatch): void {
    const payload = JSON.stringify(patch);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  function scheduleNextTick(): void {
    setTimeout(() => {
      broadcast(mutateRandomNode());
      scheduleNextTick();
    }, randomInRange(2000, 5000));
  }

  scheduleNextTick();
}
