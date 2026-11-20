const BASE = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        ...authHeader(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Cannot reach the server. Start the API and MongoDB, then try again.');
  }

  if (response.status === 401 && !path.endsWith('/login')) {
    setToken(null);
    window.dispatchEvent(new Event('auth:logout'));
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const health = () => request('/api/health');

export const login = (email, password) => request('/api/auth/login', {
  method: 'POST',
  body: { email, password },
});

export const register = (name, email, password, theme) => request('/api/auth/register', {
  method: 'POST',
  body: { name, email, password, theme },
});

export const me = async () => (await request('/api/auth/me')).user;

export const updateMe = (patch) => request('/api/auth/me', {
  method: 'PATCH',
  body: patch,
});

export const listConversations = () => request('/api/conversations');

export const createConversation = ({ signal } = {}) => request('/api/conversations', {
  method: 'POST',
  body: {},
  signal,
});

export const getConversation = (id, { signal } = {}) => request(`/api/conversations/${id}`, { signal });

export const renameConversation = (id, title) => request(`/api/conversations/${id}`, {
  method: 'PATCH',
  body: { title },
});

export const deleteConversation = (id) => request(`/api/conversations/${id}`, {
  method: 'DELETE',
});

export async function streamMessage(id, content, { signal, onToken, onMeta }) {
  let response;
  try {
    response = await fetch(`${BASE}/api/conversations/${id}/messages`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(),
      },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Cannot reach the server. Start the API and MongoDB, then try again.');
  }

  if (response.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('auth:logout'));
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not send that message.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consume = (text, flush = false) => {
    buffer += text;
    const parts = buffer.split('\n\n');
    buffer = flush ? '' : (parts.pop() || '');

    for (const part of parts) {
      const line = part.split('\n').find((entry) => entry.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;

      let data;
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }

      if (data.token) onToken?.(data.token);
      if (data.conversationId || data.done || data.title || typeof data.demo === 'boolean') {
        onMeta?.(data);
      }
      if (data.error) throw new Error(data.error);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      consume(decoder.decode(), true);
      break;
    }
    consume(decoder.decode(value, { stream: true }));
  }
}
