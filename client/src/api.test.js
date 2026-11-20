import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToken, health, login, setToken, streamMessage } from './api';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseResponse(chunks, status = 200) {
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('token storage', () => {
  it('stores and clears the bearer token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
    setToken(null);
    expect(getToken()).toBeNull();
  });
});

describe('request', () => {
  it('sends the bearer token and returns JSON', async () => {
    setToken('abc');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, ai: 'groq' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(health()).resolves.toEqual({ ok: true, ai: 'groq' });
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      method: 'GET',
      headers: { Authorization: 'Bearer abc' },
    }));
  });

  it('uses the server error message when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Email or password is incorrect.' }, 401)));
    await expect(login('ada@example.com', 'nope')).rejects.toThrow('Email or password is incorrect.');
    expect(getToken()).toBeNull();
  });

  it('says Request failed when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('proxy down', { status: 500 })));
    await expect(health()).rejects.toThrow('Request failed.');
  });

  it('clears the token and signs out on a 401 after login', async () => {
    setToken('abc');
    const onLogout = vi.fn();
    window.addEventListener('auth:logout', onLogout);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Please sign in.' }, 401)));

    await expect(health()).rejects.toThrow('Please sign in.');
    expect(getToken()).toBeNull();
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('turns a network failure into a reachable message and rethrows abort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')));
    await expect(health()).rejects.toThrow('Cannot reach the server');

    const abort = new Error('aborted');
    abort.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(health()).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('streamMessage', () => {
  it('joins token frames that arrive in pieces and reports the done frame', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([
      'data: {"conversationId":"c1","title":"Hello"}\n\n',
      'data: {"token":"Hel',
      'lo"}\n\ndata: {"done":true,"demo":true,"provider":"demo"}\n\n',
    ])));
    const tokens = [];
    const metas = [];

    await streamMessage('c1', 'Hello', {
      onToken: (token) => tokens.push(token),
      onMeta: (meta) => metas.push(meta),
    });

    expect(tokens.join('')).toBe('Hello');
    expect(metas[0]).toMatchObject({ conversationId: 'c1', title: 'Hello' });
    expect(metas.at(-1)).toMatchObject({ done: true, demo: true, provider: 'demo' });
  });

  it('throws the error frame from the stream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([
      'data: {"error":"The model could not complete that reply."}\n\n',
    ])));

    await expect(streamMessage('c1', 'Hello', {})).rejects.toThrow('The model could not complete that reply.');
  });
});
