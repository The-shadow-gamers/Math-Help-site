// Netlify Functions v2 (ESM)
export default async (req, context) => {
  const headers = { "content-type": "application/json" };

  let body = {};
  try { body = await req.json(); } catch {}
  const password = (body?.password || "").trim();
  if (!password) return new Response(JSON.stringify({ ok: false, error: "Missing password" }), { status: 400, headers });

  const ADMIN = process.env.ADMIN_PASSWORD || "";
  const USER  = process.env.USER_PASSWORD  || "";

  const secure = (req.headers.get("x-forwarded-proto") || "").toLowerCase() === "https";

  function setCookie(name, value, maxAgeSeconds) {
    context.cookies.set({
      name, value,
      httpOnly: true,
      sameSite: "Lax",
      secure,
      path: "/",
      maxAge: maxAgeSeconds
    });
  }

  if (ADMIN && password === ADMIN) {
    setCookie("mh_admin", "1", 60 * 60 * 12); // 12h
    return new Response(JSON.stringify({ ok: true, role: "admin" }), { headers });
  }

  if (USER && password === USER) {
    setCookie("mh_user", "1", 60 * 60 * 12);
    return new Response(JSON.stringify({ ok: true, role: "user" }), { headers });
  }

  return new Response(JSON.stringify({ ok: false, error: "Invalid password" }), { status: 401, headers });
};
