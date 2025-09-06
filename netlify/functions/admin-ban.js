// netlify/functions/admin-ban.js
export async function handler(event, context) {
  const caller = context.clientContext && context.clientContext.user;
  if (!caller) return { statusCode: 401, body: 'not-authenticated' };

  const roles = (caller.app_metadata && caller.app_metadata.roles) || [];
  if (!roles.includes('admin')) return { statusCode: 403, body: 'forbidden' };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'bad-json' }; }

  const { id, action } = body;
  if (!id || !['ban','unban'].includes(action)) {
    return { statusCode: 400, body: 'bad-request' };
  }

  const banned = action === 'ban';
  const { identity } = context;
  const url = `${identity.url}/admin/users/${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${identity.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ app_metadata: { banned } })
  });

  if (!res.ok) return { statusCode: res.status, body: await res.text() };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}
