export default async (_req, context) => {
  // Clear cookies
  for (const name of ["mh_admin", "mh_user"]) {
    context.cookies.set({ name, value: "", path: "/", maxAge: 0, httpOnly: true, sameSite: "Lax", secure: true });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
