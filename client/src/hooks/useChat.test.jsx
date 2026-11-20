import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from './useChat';
import * as api from '../api';

vi.mock('../api', () => ({
  listConversations: vi.fn(),
  health: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  streamMessage: vi.fn(),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.listConversations.mockResolvedValue({
    conversations: [{ id: 'c1', title: 'Old', updatedAt: '2026-01-01T00:00:00.000Z' }],
  });
  api.health.mockResolvedValue({ ai: 'groq' });
});

async function mount() {
  const hook = renderHook(() => useChat());
  await waitFor(() => expect(hook.result.current.aiMode).toBe('groq'));
  return hook;
}

describe('useChat', () => {
  it('loads the sidebar and the provider from health', async () => {
    const { result } = await mount();
    expect(result.current.conversations.map((chat) => chat.title)).toEqual(['Old']);
    expect(result.current.aiMode).toBe('groq');
  });

  it('creates a chat on the first send and appends streamed tokens', async () => {
    api.createConversation.mockResolvedValue({
      conversation: { id: 'c2', title: 'New chat', updatedAt: '2026-01-02T00:00:00.000Z' },
    });
    api.streamMessage.mockImplementation(async (_id, _content, { onToken, onMeta }) => {
      onMeta({ conversationId: 'c2', title: 'Hello', updatedAt: '2026-01-02T00:00:00.000Z' });
      onToken('Hi');
      onToken(' there');
      onMeta({ done: true, demo: false, provider: 'groq', title: 'Hello' });
    });

    const { result } = await mount();
    await act(async () => {
      await result.current.send('  Hello  ');
    });

    expect(api.createConversation).toHaveBeenCalledOnce();
    expect(result.current.activeId).toBe('c2');
    expect(result.current.messages.map((message) => message.content)).toEqual(['Hello', 'Hi there']);
    expect(result.current.conversations[0]).toMatchObject({ id: 'c2', title: 'Hello' });
    expect(result.current.streaming).toBe(false);
  });

  it('removes both optimistic bubbles when the send is rejected before it is saved', async () => {
    api.createConversation.mockResolvedValue({
      conversation: { id: 'c2', title: 'New chat' },
    });
    api.streamMessage.mockRejectedValue(new Error('Could not send that message.'));

    const { result } = await mount();
    await act(async () => {
      await result.current.send('Hello');
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.snack).toBe('Could not send that message.');
  });

  it('loads a selected chat and ignores a second click on the same one', async () => {
    api.getConversation.mockResolvedValue({
      conversation: { messages: [{ id: 'm1', role: 'user', content: 'Hi' }] },
    });

    const { result } = await mount();
    await act(async () => {
      await result.current.selectConversation('c1');
    });
    await act(async () => {
      await result.current.selectConversation('c1');
    });

    expect(api.getConversation).toHaveBeenCalledOnce();
    expect(result.current.messages[0].content).toBe('Hi');
  });

  it('clears the open thread on new chat, and after deleting the active chat', async () => {
    api.getConversation.mockResolvedValue({
      conversation: { messages: [{ id: 'm1', role: 'user', content: 'Hi' }] },
    });
    api.deleteConversation.mockResolvedValue({ ok: true });

    const { result } = await mount();
    await act(async () => {
      await result.current.selectConversation('c1');
    });
    act(() => result.current.newChat());
    expect(result.current.activeId).toBeNull();
    expect(result.current.messages).toEqual([]);

    await act(async () => {
      await result.current.selectConversation('c1');
    });
    await act(async () => {
      await result.current.deleteConversation('c1');
    });
    expect(result.current.conversations).toEqual([]);
    expect(result.current.messages).toEqual([]);
  });

  it('renames the open chat in the sidebar', async () => {
    api.getConversation.mockResolvedValue({ conversation: { messages: [] } });
    api.renameConversation.mockResolvedValue({ conversation: { title: 'Renamed' } });
    const { result } = await mount();

    await act(async () => {
      await result.current.selectConversation('c1');
    });
    await act(async () => {
      await result.current.renameConversation('c1', 'Renamed');
    });

    expect(result.current.conversations[0].title).toBe('Renamed');
    expect(result.current.activeTitle).toBe('Renamed');
  });
});
