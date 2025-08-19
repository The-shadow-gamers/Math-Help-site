export default async (req, context) => {
  const secure = (req.headers.get("x-forwarded-proto") || "").toLowerCase() === "https";
  const base = { httpOnly: true, sameSite: "Lax", secure, path: "/", maxAge: 0, value: "" };
  for (const name of ["mh_admin", "mh_user"]) context.cookies.set({ ...base, name });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
