// REST backend: talks to the local Express server.
// A future supabase.js would export the same shape so the UI never changes.

async function request(method, url, body) {
  // keepalive lets a pending delete finish even if the tab is closing.
  const options = { method, headers: {}, keepalive: method === 'DELETE' };
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

const form = (fields, files = {}) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) data.append(k, String(v));
  for (const [k, file] of Object.entries(files)) if (file) data.append(k, file, file.name);
  return data;
};

// list / create under a project, update / remove by id.
const scoped = (name) => ({
  list: (projectId) => request('GET', `/projects/${projectId}/${name}`),
  create: (projectId, fields) => request('POST', `/projects/${projectId}/${name}`, fields),
  update: (id, fields) => request('PATCH', `/${name}/${id}`, fields),
  remove: (id) => request('DELETE', `/${name}/${id}`),
});

export const restBackend = {
  health: () => request('GET', '/health'),
  dashboard: () => request('GET', '/dashboard'),
  search: (q) => request('GET', `/search?q=${encodeURIComponent(q)}`),

  projects: {
    list: () => request('GET', '/projects'),
    get: (id) => request('GET', `/projects/${id}`),
    insights: (id) => request('GET', `/projects/${id}/insights`),
    create: (fields) => request('POST', '/projects', fields),
    update: (id, fields) => request('PATCH', `/projects/${id}`, fields),
    remove: (id) => request('DELETE', `/projects/${id}`),
    tags: () => request('GET', '/projects/tags'),
  },

  log: {
    ...scoped('log'),
    get: (id) => request('GET', `/log/${id}`),
  },

  photos: {
    list: (projectId) => request('GET', `/projects/${projectId}/photos`),
    // files: File[]; options: { logEntryId, caption }
    upload: (projectId, files, { logEntryId, caption } = {}) => {
      const data = new FormData();
      for (const file of files) data.append('files', file, file.name || 'pasted-image.png');
      if (logEntryId) data.append('log_entry_id', String(logEntryId));
      if (caption) data.append('caption', caption);
      return request('POST', `/projects/${projectId}/photos`, data);
    },
    update: (id, fields) => request('PATCH', `/photos/${id}`, fields),
    remove: (id) => request('DELETE', `/photos/${id}`),
  },

  purchases: {
    ...scoped('purchases'),
    meta: () => request('GET', '/purchases/meta'),
    uploadReceipt: (id, file) => request('POST', `/purchases/${id}/receipt`, form({}, { file })),
    removeReceipt: (id) => request('DELETE', `/purchases/${id}/receipt`),
  },

  tasks: scoped('tasks'),

  links: {
    ...scoped('links'),
    // A file instead of a URL: CAD models, drawings, datasheets.
    upload: (projectId, file, fields = {}) => request('POST', `/projects/${projectId}/links`, form(fields, { file })),
  },
};
