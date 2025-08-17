const crypto = require("crypto");

function parseCookie(header = "") {
  return Object.fromEntries(
    header.split(";").map(c => c.trim().split("=").map(decodeURIComponent)).filter(([k]) => k)
  );
}

exports.handler = async (event) => {
  const cookies = parseCookie(event.headers.cookie || "");
  const token = cookies["mh_session"];
  if (!token) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlocked: false }) };
  }

  const [ts, sig] = token.split(".");
  if (!ts || !sig) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlocked: false }) };
  }

  const secret = process.env.SIGNING_SECRET || "change-me";
  const expect = crypto.createHmac("sha256", secret).update(ts).digest("base64url");
  if (sig !== expect) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlocked: false }) };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ unlocked: true }) };
};
