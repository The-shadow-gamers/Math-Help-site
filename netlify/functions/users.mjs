import { getStore } from "@netlify/blobs"; // Netlify Blobs KV :contentReference[oaicite:1]{index=1}

const store = getStore("users"); // a named store for your site

const headers = { "content-type": "application/json" };
const now = () => Date.now();

async function loadIndex() {
  const idx = await store.get("index.json", { type: "json" });
  return Array.isArray(idx) ? idx : [];
}
async function saveIndex(list) {
  await store.set("index.json", JSON.stringify(list));
}
const keyFor = (email) => `user:${email.toLowerCase()}.json`;

async function getUser(email) {
  return await store.get(keyFor(email), { type: "json" });
}
async function putUser(user) {
  await store.set(keyFor(user.email), JSON.stringify(user));
}

function isAdmin(context) {
  return context.cookies.get("mh_admin")?.value === "1";
}

/**
 * Methods:
 *  POST /users/register { email } -> { ok, banned, banUntil }
 *  GET  /users/list      (admin)  -> { ok, users: [{ email, nickname, banUntil, created, lastSeen }] }
 *  POST /users/admin     (admin)  -> actions:
 *     { action:"nickname", email, nickname }
 *     { action:"ban_perm", email }
 *     { action:"ban_temp", email, seconds }   // e.g., 3600, 86400, 604800
 *     { action:"unban", email }
 *  GET  /users/check?email=...    -> { ok, banned, banUntil }
 */
export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname; // ends with /.netlify/functions/users
  const method = req.method;

  try {
    if (method === "POST" && url.searchParams.get("op") === "register") {
      const { email } = await req.json();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid email" }), { status: 400, headers });
      }
      const idx = await loadIndex();
      let user = await getUser(email);
      if (!user) {
        user = { email: email.toLowerCase(), nickname: "", created: now(), lastSeen: now(), banUntil: null };
        await putUser(user);
        if (!idx.includes(user.email)) { idx.push(user.email); await saveIndex(idx); }
      } else {
        user.lastSeen = now();
        await putUser(user);
      }
      const banned = user.banUntil === -1 || (typeof user.banUntil === "number" && user.banUntil > now());
      return new Response(JSON.stringify({ ok: true, banned, banUntil: user.banUntil ?? null }), { headers });
    }

    if (method === "GET" && url.searchParams.get("op") === "check") {
      const email = url.searchParams.get("email");
      if (!email) return new Response(JSON.stringify({ ok: false, error: "Missing email" }), { status: 400, headers });
      const user = await getUser(email);
      const banned = !!user && (user.banUntil === -1 || (typeof user.banUntil === "number" && user.banUntil > now()));
      return new Response(JSON.stringify({ ok: true, banned, banUntil: user?.banUntil ?? null }), { headers });
    }

    if (method === "GET" && url.searchParams.get("op") === "list") {
      if (!isAdmin(context)) return new Response(JSON.stringify({ ok: false, error: "Admin only" }), { status: 401, headers });
      const idx = await loadIndex();
      const users = await Promise.all(idx.map(async (email) => {
        const u = await getUser(email);
        return { email, nickname: u?.nickname || "", banUntil: u?.banUntil ?? null, created: u?.created ?? null, lastSeen: u?.lastSeen ?? null };
      }));
      // newest first
      users.sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
      return new Response(JSON.stringify({ ok: true, users }), { headers });
    }

    if (method === "POST" && url.searchParams.get("op") === "admin") {
      if (!isAdmin(context)) return new Response(JSON.stringify({ ok: false, error: "Admin only" }), { status: 401, headers });
      const body = await req.json();
      const { action, email } = body || {};
      if (!email) return new Response(JSON.stringify({ ok: false, error: "Missing email" }), { status: 400, headers });

      let user = await getUser(email);
      if (!user) return new Response(JSON.stringify({ ok: false, error: "User not found" }), { status: 404, headers });

      if (action === "nickname") {
        user.nickname = (body.nickname || "").slice(0, 60);
      } else if (action === "ban_perm") {
        user.banUntil = -1;
      } else if (action === "ban_temp") {
        const seconds = Math.max(1, Number(body.seconds || 0));
        user.banUntil = now() + seconds * 1000;
      } else if (action === "unban") {
        user.banUntil = null;
      } else {
        return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers });
      }
      await putUser(user);
      return new Response(JSON.stringify({ ok: true, user }), { headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Server error" }), { status: 500, headers });
  }
};
