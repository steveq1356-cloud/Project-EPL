// REST backend: talks to the local Express server.
// A future supabase.js would export the same shape so the UI never changes.

async function request(method, url, body) {
  const options = { method, headers: {} };
  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${url}`, options);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${method} ${url} failed (${res.status})`);
  return data;
}

export const restBackend = {
  health: () => request('GET', '/health'),

  projects: {
    list: () => request('GET', '/projects'),
    get: (id) => request('GET', `/projects/${id}`),
    create: (fields) => request('POST', '/projects', fields),
    update: (id, fields) => request('PATCH', `/projects/${id}`, fields),
    remove: (id) => request('DELETE', `/projects/${id}`),
    tags: () => request('GET', '/projects/tags'),
  },
};
