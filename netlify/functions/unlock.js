const crypto = require("crypto");

function sign(secret, ts, role) {
  return crypto.createHmac("sha256", secret).update(`${ts}.${role}`).digest("base64url");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { password } = JSON.parse(event.body || "{}");

    const userPw  = process.env.APP_PASSWORD_USER  || process.env.APP_PASSWORD || "";
    const adminPw = process.env.APP_PASSWORD_ADMIN || "";
    const secret  = process.env.SIGNING_SECRET || "change-me";

    let role = null;
    if (password && adminPw && password === adminPw) role = "admin";
    else if (password && password === userPw) role = "user";

    if (!role) {
      return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false }) };
    }

    const ts  = Date.now().toString();
    const sig = sign(secret, ts, role);
    const token = `${ts}.${role}.${sig}`;

    // Session cookie (no Max-Age) => login each visit
    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `mh_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ ok: true, role })
    };
  } catch {
    return { statusCode: 400, body: "Bad Request" };
  }
};
