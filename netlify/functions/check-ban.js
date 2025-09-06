// netlify/functions/check-ban.js
export async function handler(event, context) {
  const clientUser = context.clientContext && context.clientContext.user;
  if (!clientUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'not-authenticated' }) };
  }
  const banned = !!(clientUser.app_metadata && clientUser.app_metadata.banned);
  if (banned) {
    return { statusCode: 403, body: JSON.stringify({ error: 'banned' }) };
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}
