import { useEffect, useRef, useState } from 'react';
import * as api from '../api';

export function useChat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [aiMode, setAiMode] = useState('demo');
  const [snack, setSnack] = useState('');

  const requestRef = useRef(0);
  const abortRef = useRef(null);
  const sendingRef = useRef(false);
  const activeIdRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    let live = true;
    api.listConversations()
      .then((data) => {
        if (live) setConversations(data.conversations);
      })
      .catch((err) => {
        if (live) setSnack(err.message);
      });
    api.health()
      .then((data) => {
        if (live && data.ai) setAiMode(data.ai);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  function bumpRequest() {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setStreaming(false);
    return requestRef.current;
  }

  function newChat() {
    bumpRequest();
    setActiveId(null);
    setMessages([]);
    setLoadingChat(false);
  }

  async function selectConversation(id) {
    if (id === activeIdRef.current && !sendingRef.current) return;
    const requestId = bumpRequest();
    setActiveId(id);
    setMessages([]);
    setLoadingChat(true);

    try {
      const data = await api.getConversation(id);
      if (requestRef.current !== requestId) return;
      setMessages(data.conversation.messages);
    } catch (err) {
      if (requestRef.current !== requestId || err.name === 'AbortError') return;
      setSnack(err.message);
    } finally {
      if (requestRef.current === requestId) setLoadingChat(false);
    }
  }

  async function send(raw) {
    const content = raw.trim();
    if (!content || sendingRef.current) return false;

    const requestId = ++requestRef.current;
    sendingRef.current = true;
    setStreaming(true);

    const userLocalId = `user-${requestId}`;
    const streamLocalId = `stream-${requestId}`;
    setMessages((prev) => [
      ...prev,
      { id: userLocalId, role: 'user', content },
      { id: streamLocalId, role: 'assistant', content: '' },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    let accepted = false;
    let conversationId = activeIdRef.current;
    const still = () => requestRef.current === requestId;

    const touchConversation = (meta) => {
      if (!conversationId) return;
      setConversations((prev) => {
        const current = prev.find((item) => item.id === conversationId) || { id: conversationId };
        const rest = prev.filter((item) => item.id !== conversationId);
        return [{
          ...current,
          title: meta.title || current.title || 'New chat',
          updatedAt: meta.updatedAt || new Date().toISOString(),
        }, ...rest];
      });
    };

    try {
      if (!conversationId) {
        const created = await api.createConversation({ signal: controller.signal });
        if (!still()) return true;
        conversationId = created.conversation.id;
        setActiveId(conversationId);
        setConversations((prev) => [
          created.conversation,
          ...prev.filter((item) => item.id !== conversationId),
        ]);
      }

      await api.streamMessage(conversationId, content, {
        signal: controller.signal,
        onToken(token) {
          if (!still()) return;
          setMessages((prev) => prev.map((message) => (
            message.id === streamLocalId
              ? { ...message, content: message.content + token }
              : message
          )));
        },
        onMeta(meta) {
          if (!still()) return;
          if (meta.conversationId) accepted = true;
          if (meta.demo === true) setAiMode('demo');
          if (meta.demo === false) setAiMode(meta.provider || 'groq');
          if (meta.title || meta.updatedAt) touchConversation(meta);
        },
      });

      return true;
    } catch (err) {
      if (!still()) return true;
      const aborted = err.name === 'AbortError';
      if (!aborted) setSnack(err.message || 'Could not send that message.');
      setMessages((prev) => {
        const withoutEmpty = prev.filter((message) => !(message.id === streamLocalId && !message.content));
        if (!accepted) return withoutEmpty.filter((message) => message.id !== userLocalId);
        return withoutEmpty;
      });
      return aborted || accepted;
    } finally {
      if (still()) {
        sendingRef.current = false;
        setStreaming(false);
        abortRef.current = null;
      }
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function renameConversation(id, title) {
    const data = await api.renameConversation(id, title);
    setConversations((prev) => prev.map((item) => (
      item.id === id ? { ...item, title: data.conversation.title } : item
    )));
  }

  async function deleteConversation(id) {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((item) => item.id !== id));
    if (activeIdRef.current === id) {
      bumpRequest();
      setActiveId(null);
      setMessages([]);
      setLoadingChat(false);
    }
  }

  const activeTitle = conversations.find((item) => item.id === activeId)?.title || 'New chat';

  return {
    conversations,
    activeId,
    activeTitle,
    messages,
    streaming,
    loadingChat,
    aiMode,
    snack,
    setSnack,
    newChat,
    selectConversation,
    send,
    stop,
    renameConversation,
    deleteConversation,
  };
}
