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
  const cookies = parseCookie(event.headers.cookie || "");
  const token = cookies["mh_session"];
  if (!token) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlocked: false }) };
  }
  const secret = process.env.SIGNING_SECRET || "change-me";
  const payload = verify(secret, token);
  if (!payload) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlocked: false }) };
  }
  return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ unlocked: true, role: payload.role }) };
};
