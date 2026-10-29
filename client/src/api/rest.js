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

  log: {
    list: (projectId) => request('GET', `/projects/${projectId}/log`),
    get: (id) => request('GET', `/log/${id}`),
    create: (projectId, fields) => request('POST', `/projects/${projectId}/log`, fields),
    update: (id, fields) => request('PATCH', `/log/${id}`, fields),
    remove: (id) => request('DELETE', `/log/${id}`),
  },

  photos: {
    list: (projectId) => request('GET', `/projects/${projectId}/photos`),
    // files: File[]; options: { logEntryId, caption }
    upload: (projectId, files, { logEntryId, caption } = {}) => {
      const form = new FormData();
      for (const file of files) form.append('files', file, file.name || 'pasted-image.png');
      if (logEntryId) form.append('log_entry_id', String(logEntryId));
      if (caption) form.append('caption', caption);
      return request('POST', `/projects/${projectId}/photos`, form);
    },
    update: (id, fields) => request('PATCH', `/photos/${id}`, fields),
    remove: (id) => request('DELETE', `/photos/${id}`),
  },
};
