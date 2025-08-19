import { getStore } from "@netlify/blobs";

const store = getStore("users");
const headers = { "content-type": "application/json" };
const now = () => Date.now();
const keyFor = (email) => `user:${email.toLowerCase()}.json`;

function isAdmin(context) {
  return context.cookies.get("mh_admin")?.value === "1";
}

async function loadIndex() {
  const idx = await store.get("index.json", { type: "json" });
  return Array.isArray(idx) ? idx : [];
}
async function saveIndex(list) {
  await store.set("index.json", JSON.stringify(list));
}
async function getUser(email) {
  return await store.get(keyFor(email), { type: "json" });
}
async function putUser(u) {
  await store.set(keyFor(u.email), JSON.stringify(u));
}

export default async (req, context) => {
  const url = new URL(req.url);
  const op = url.searchParams.get("op");
  const method = req.method;

  try {
    // POST register
    if (method === "POST" && op === "register") {
      const { email } = await req.json();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return new Response(JSON.stringify({ ok: false, error: "Invalid email" }), { status: 400, headers });

      const idx = await loadIndex();
      let u = await getUser(email);
      if (!u) {
        u = { email: email.toLowerCase(), nickname: "", created: now(), lastSeen: now(), banUntil: null };
        await putUser(u);
        if (!idx.includes(u.email)) { idx.push(u.email); await saveIndex(idx); }
      } else {
        u.lastSeen = now();
        await putUser(u);
      }
      const banned = u.banUntil === -1 || (typeof u.banUntil === "number" && u.banUntil > now());
      return new Response(JSON.stringify({ ok: true, banned, banUntil: u.banUntil ?? null }), { headers });
    }

    // GET check
    if (method === "GET" && op === "check") {
      const email = url.searchParams.get("email");
      if (!email) return new Response(JSON.stringify({ ok: false, error: "Missing email" }), { status: 400, headers });
      const u = await getUser(email);
      const banned = !!u && (u.banUntil === -1 || (typeof u.banUntil === "number" && u.banUntil > now()));
      return new Response(JSON.stringify({ ok: true, banned, banUntil: u?.banUntil ?? null }), { headers });
    }

    // GET list (admin)
    if (method === "GET" && op === "list") {
      if (!isAdmin(context)) return new Response(JSON.stringify({ ok: false, error: "Admin only" }), { status: 401, headers });
      const idx = await loadIndex();
      const users = await Promise.all(idx.map(async (email) => {
        const u = await getUser(email);
        return { email, nickname: u?.nickname || "", banUntil: u?.banUntil ?? null, created: u?.created ?? null, lastSeen: u?.lastSeen ?? null };
      }));
      users.sort((a,b)=>(b.lastSeen??0)-(a.lastSeen??0));
      return new Response(JSON.stringify({ ok: true, users }), { headers });
    }

    // POST admin actions
    if (method === "POST" && op === "admin") {
      if (!isAdmin(context)) return new Response(JSON.stringify({ ok: false, error: "Admin only" }), { status: 401, headers });
      const body = await req.json();
      const { action, email } = body || {};
      if (!email) return new Response(JSON.stringify({ ok: false, error: "Missing email" }), { status: 400, headers });

      let u = await getUser(email);
      if (!u) return new Response(JSON.stringify({ ok: false, error: "User not found" }), { status: 404, headers });

      if (action === "nickname") u.nickname = (body.nickname || "").slice(0,60);
      else if (action === "ban_perm") u.banUntil = -1;
      else if (action === "ban_temp") u.banUntil = now() + Math.max(1, Number(body.seconds || 0)) * 1000;
      else if (action === "unban") u.banUntil = null;
      else return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers });

      await putUser(u);
      return new Response(JSON.stringify({ ok: true, user: u }), { headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Server error" }), { status: 500, headers });
  }
};
