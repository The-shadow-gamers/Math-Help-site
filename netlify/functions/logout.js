exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": "mh_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict",
      "Cache-Control": "no-store",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ok: true })
  };
};
