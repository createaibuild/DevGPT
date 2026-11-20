const SYSTEM_PROMPT = `You are DevGPT, a helpful assistant in a chat app.
Write in GitHub-flavored markdown.
Use short sections, bullet lists, and tables when they make the answer easier to scan.
When the user asks for an image, include one markdown image that uses a public https URL.
Be clear, concrete, and not overly long.`;

const SAMPLE_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360"><rect width="720" height="360" fill="#146b58"/><circle cx="575" cy="78" r="34" fill="#f4e4bc"/><path d="M0 250 L150 160 L260 214 L400 118 L560 230 L720 168 V360 H0 Z" fill="#0c3d34"/><text x="36" y="324" fill="#ffffff" font-size="28" font-family="Georgia, serif">Sample image</text></svg>'
)}`;

const GROQ_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'openai/gpt-oss-120b';

function trimmed(name) {
  return (process.env[name] || '').trim();
}

// Groq is preferred. OpenAI is used only when GROQ_API_KEY is empty.
export function providerConfig() {
  const groqKey = trimmed('GROQ_API_KEY');
  if (groqKey) {
    return {
      name: 'groq',
      apiKey: groqKey,
      baseUrl: (trimmed('GROQ_BASE_URL') || GROQ_URL).replace(/\/$/, ''),
      model: trimmed('GROQ_MODEL') || GROQ_MODEL,
    };
  }

  const openaiKey = trimmed('OPENAI_API_KEY');
  if (openaiKey) {
    return {
      name: 'openai',
      apiKey: openaiKey,
      baseUrl: (trimmed('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: trimmed('OPENAI_MODEL') || 'gpt-4o-mini',
    };
  }

  return null;
}

export function usingDemo() {
  return !providerConfig();
}

function delay(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

// Local rich reply used when neither GROQ_API_KEY nor OPENAI_API_KEY is set.
export function buildDemoReply(history) {
  const last = [...history].reverse().find((message) => message.role === 'user')?.content || '';
  const topic = last.replace(/\s+/g, ' ').replace(/[|*_`#[\]]/g, '').trim().slice(0, 140) || 'your question';

  const quoted = `“${topic}”`;
  let lead = `Here is a concise take on ${quoted}.`;
  if (/simpl/i.test(last)) lead = `Here is a simpler take on ${quoted}.`;
  else if (/table|compare/i.test(last)) lead = `Here is ${quoted}, laid out so it is easy to scan.`;
  else if (/detail|explain more|more detail/i.test(last)) lead = `Here is a closer look at ${quoted}.`;

  const image = /image|picture|photo|diagram/i.test(last)
    ? `\n\n![Sample image](${SAMPLE_IMAGE})\n`
    : '';

  return `${lead}

This reply is streamed locally because no Groq API key is set.

### Highlights
- The conversation is saved to your account
- The answer appears as it is generated
- Lists, tables, and images render in the thread

| Part | What you should see |
| --- | --- |
| Sign in | Your name, email, and theme stay on the account |
| Chats | The thread is still in the sidebar after a refresh |
| Streaming | Words show up a few at a time |
| Choices | The buttons under this reply send a follow-up |

Use a choice below if you want a different shape.${image}`;
}

export async function streamAssistant({ messages, signal, onToken }) {
  if (usingDemo()) {
    const parts = buildDemoReply(messages).split(/(\s+)/);
    for (const part of parts) {
      if (signal?.aborted) return;
      if (!part) continue;
      await delay(12, signal);
      if (signal?.aborted) return;
      onToken(part);
    }
    return;
  }

  const provider = providerConfig();
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      stream: true,
      temperature: 0.7,
      max_tokens: 900,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Model request failed', response.status, detail.slice(0, 300));
    throw new Error('The model could not complete that reply.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const json = JSON.parse(payload);
        const token = json.choices?.[0]?.delta?.content || '';
        if (token) onToken(token);
      } catch {
        // Ignore a partial SSE frame. The next chunk completes it.
      }
    }
  }
}
