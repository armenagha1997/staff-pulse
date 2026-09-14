import cors from "cors";
import "dotenv/config";
import express from "express";
import http from "node:http";
import { store } from "./data.js";
import { attachLiveUpdates } from "./live.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));

// Dev-only query params let the client's loading/error/empty states be exercised on demand:
// /api/org-tree?scenario=empty | ?scenario=error | ?delay=2000
app.get("/api/org-tree", (req, res) => {
  const scenario = req.query.scenario;
  const delay = Number(req.query.delay ?? 0);

  setTimeout(() => {
    if (scenario === "error") {
      res.status(500).json({ error: "Internal error (simulated)" });
      return;
    }
    if (scenario === "empty") {
      res.json([]);
      return;
    }
    res.json(store.nodes);
  }, delay);
});

const httpServer = http.createServer(app);
attachLiveUpdates(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (WS: ws://localhost:${PORT}/ws)`);
});
