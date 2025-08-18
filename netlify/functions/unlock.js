const crypto = require("crypto");

function b64u(buf){ return Buffer.from(buf).toString("base64url"); }
function sign(secret, ts, role){
  return b64u(crypto.createHmac("sha256", secret).update(`${ts}.${role}`).digest());
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { password } = JSON.parse(event.body || "{}");
    const userPw  = process.env.APP_PASSWORD_USER  || "";
    const adminPw = process.env.APP_PASSWORD_ADMIN || "";
    const secret  = process.env.SIGNING_SECRET     || "change-me";

    let role = null;
    if (password && password === adminPw) role = "admin";
    else if (password && password === userPw) role = "user";

    if (!role) {
      return { statusCode: 401, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false }) };
    }

    const ts  = Date.now();
    const sig = sign(secret, ts, role);
    const token = `${ts}.${role}.${sig}`;

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `mh_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ ok:true, role })
    };
  } catch (e) {
    return { statusCode: 400, body: "Bad Request" };
  }
};
