const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { password } = JSON.parse(event.body || "{}");
    const real = process.env.APP_PASSWORD || "";
    if (!password || password !== real) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ ok: false })
      };
    }

    const secret = process.env.SIGNING_SECRET || "change-me";
    const ts = Date.now().toString();
    const sig = crypto.createHmac("sha256", secret).update(ts).digest("base64url");
    const token = `${ts}.${sig}`;

    const oneDay = 60 * 60 * 24;
    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `mh_session=${token}; Path=/; Max-Age=${oneDay}; HttpOnly; Secure; SameSite=Strict`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ ok: true })
    };
  } catch {
    return { statusCode: 400, body: "Bad Request" };
  }
};
