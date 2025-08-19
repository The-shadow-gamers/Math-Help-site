// Functions v2 (ESM)
export default async (req, context) => {
  const { password } = await req.json();
  const headers = { "content-type": "application/json" };

  if (!password) return new Response(JSON.stringify({ ok: false, error: "Missing password" }), { status: 400, headers });

  if (password === process.env.ADMIN_PASSWORD) {
    // Admin session cookie
    context.cookies.set({
      name: "mh_admin",
      value: "1",
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });
    return new Response(JSON.stringify({ ok: true, role: "admin" }), { headers });
  }

  if (password === process.env.USER_PASSWORD) {
    // Mark as user (mostly symbolic; bans are checked separately)
    context.cookies.set({
      name: "mh_user",
      value: "1",
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return new Response(JSON.stringify({ ok: true, role: "user" }), { headers });
  }

  return new Response(JSON.stringify({ ok: false, error: "Invalid password" }), { status: 401, headers });
};
