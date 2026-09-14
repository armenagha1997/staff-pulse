import cors from "cors";
import "dotenv/config";
import express from "express";
import http from "node:http";
import { heuristicParse } from "./aiSearch.js";
import { store } from "./data.js";
import { attachLiveUpdates } from "./live.js";
import { llmParse } from "./llmSearch.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

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

// Natural-language search: tries Claude (if ANTHROPIC_API_KEY is set) first,
// falls back to an offline rule-based parser otherwise or on any LLM failure.
// Always responds 200 with SOME StructuredFilter — a hard failure here (network
// down, server unreachable) is what pushes the client to its own local
// text-search fallback, not this endpoint returning an error.
app.post("/api/ai-search", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query) {
    res.json({ filter: {}, source: "heuristic" });
    return;
  }

  const llmFilter = await llmParse(query);
  if (llmFilter) {
    res.json({ filter: llmFilter, source: "llm" });
    return;
  }

  res.json({ filter: heuristicParse(query), source: "heuristic" });
});

const httpServer = http.createServer(app);
attachLiveUpdates(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (WS: ws://localhost:${PORT}/ws)`);
});
