// netlify/functions/admin-list-users.js
export async function handler(event, context) {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return { statusCode: 401, body: 'not-authenticated' };
  const roles = (user.app_metadata && user.app_metadata.roles) || [];
  if (!roles.includes('admin')) return { statusCode: 403, body: 'forbidden' };

  const { identity } = context; // { url, token }
  const url = `${identity.url}/admin/users?per_page=100&page=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${identity.token}` }
  });
  if (!res.ok) return { statusCode: res.status, body: await res.text() };

  const users = await res.json();
  const light = users.map(u => ({
    id: u.id,
    email: u.email,
    app_metadata: u.app_metadata || {}
  }));

  return { statusCode: 200, body: JSON.stringify({ users: light }) };
}
