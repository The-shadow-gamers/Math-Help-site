const { getStore } = require("@netlify/blobs");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

exports.handler = async (event) => {
  const url = new URL(event.rawUrl);
  const since = Math.max(0, Number(url.searchParams.get("since") || 0));
  const waitMs = Math.min(15000, Math.max(0, Number(url.searchParams.get("wait") || 0)));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 50)));

  const store = getStore("mh-events");
  const seqKey = "seq";

  async function readBatch() {
    const latestRaw = await store.get(seqKey);
    const latest = Number(latestRaw || 0);
    const have = latest - since;
    if (have <= 0) return { latest, events: [] };

    const toFetch = Math.min(have, limit);
    const events = [];
    for (let i = latest - toFetch + 1; i <= latest; i++) {
      const raw = await store.get(`e/${i}`);
      if (raw) {
        try { events.push(JSON.parse(raw)); } catch {}
      }
    }
    return { latest, events };
  }

  let out = await readBatch();
  const start = Date.now();
  while (out.events.length === 0 && (Date.now() - start) < waitMs) {
    await sleep(1000);
    out = await readBatch();
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(out)
  };
};
