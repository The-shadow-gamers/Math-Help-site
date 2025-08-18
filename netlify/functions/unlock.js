const crypto = require("crypto");

function sign(secret, ts) {
  return crypto.createHmac("sha256", secret).update(String(ts)).digest("base64url");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { password } = JSON.parse(event.body || "{}");

    const userPw = process.env.APP_PASSWORD_USER || "";
    const secret = process.env.SIGNING_SECRET || "change-me";

    if (!password || password !== userPw) {
      return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false }) };
    }

    const ts  = Date.now();
    const sig = sign(secret, ts);
    const token = `${ts}.${sig}`;

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `mh_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ ok: true })
    };
  } catch {
    return { statusCode: 400, body: "Bad Request" };
  }
};
