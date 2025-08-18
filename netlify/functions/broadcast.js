const crypto = require("crypto");

function parseCookie(header = "") {
  return Object.fromEntries(
    header.split(";").map(c => c.trim().split("=").map(decodeURIComponent)).filter(([k]) => k)
  );
}
function verify(secret, token) {
  const [ts, role, sig] = (token || "").split(".");
  if (!ts || !role || !sig) return null;
  const expect = crypto.createHmac("sha256", secret).update(`${ts}.${role}`).digest("base64url");
  if (sig !== expect) return null;
  return { ts: Number(ts), role };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    // ✅ ESM module loaded via dynamic import
    const { getStore } = await import("@netlify/blobs");

    const cookies = parseCookie(event.headers.cookie || "");
    const token = cookies["mh_session"];
    const secret = process.env.SIGNING_SECRET || "change-me";
    const auth = verify(secret, token);
    if (!auth || auth.role !== "admin") {
      return { statusCode: 403, body: "Forbidden" };
    }

    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return { statusCode: 400, body: "Invalid JSON" }; }

    const allowedTypes = new Set(["message", "sound"]);
    if (!allowedTypes.has(payload.type)) return { statusCode: 400, body: "Invalid type" };

    if (payload.type === "message") {
      const styles = new Set(["banner", "overlay", "toast", "modal"]);
      const levels = new Set(["info", "warn", "error"]);
      if (!payload.text || typeof payload.text !== "string") return { statusCode: 400, body: "Missing text" };
      if (!styles.has(payload.style)) return { statusCode: 400, body: "Invalid style" };
      if (!levels.has(payload.level)) return { statusCode: 400, body: "Invalid level" };
      if (payload.durationMs && typeof payload.durationMs !== "number") return { statusCode: 400, body: "Invalid durationMs" };
    }
    if (payload.type === "sound") {
      if (!payload.id || typeof payload.id !== "string") return { statusCode: 400, body: "Missing sound id" };
    }

    const store = getStore("mh-events");
    const seqKey = "seq";
    const now = Date.now();

    const seqRaw = await store.get(seqKey);
    const seq = Number(seqRaw || 0) + 1;

    const eventObj = { id: seq, ts: now, payload };
    await store.set(`e/${seq}`, JSON.stringify(eventObj));
    await store.set(seqKey, String(seq));

    if (payload.type === "message") {
      await store.set("state/message", JSON.stringify({ ts: now, payload }));
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, id: seq }) };
  } catch (e) {
    // Return a JSON error instead of crashing → avoids 502
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok:false, error: String(e && e.message || e) }) };
  }
};
