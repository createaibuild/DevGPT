import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildDemoReply,
  providerConfig,
  streamAssistant,
  usingDemo,
} from "../src/services/ai.js";

const KEYS = [
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "GROQ_BASE_URL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
];
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function setEnv(values) {
  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("providerConfig", () => {
  it("prefers Groq and uses the default model", () => {
    setEnv({ GROQ_API_KEY: "gsk_test", OPENAI_API_KEY: "sk_test" });
    const provider = providerConfig();

    assert.equal(provider.name, "groq");
    assert.equal(provider.apiKey, "gsk_test");
    assert.equal(provider.model, "openai/gpt-oss-120b");
    assert.equal(provider.baseUrl, "https://api.groq.com/openai/v1");
    assert.equal(usingDemo(), false);
  });

  it("uses OpenAI only when the Groq key is empty", () => {
    setEnv({
      OPENAI_API_KEY: "sk_test",
      OPENAI_MODEL: "gpt-4o-mini",
      OPENAI_BASE_URL: "https://example.test/v1/",
    });
    const provider = providerConfig();

    assert.equal(provider.name, "openai");
    assert.equal(provider.model, "gpt-4o-mini");
    assert.equal(provider.baseUrl, "https://example.test/v1");
  });

  it("is demo mode when both keys are empty", () => {
    setEnv({});
    assert.equal(providerConfig(), null);
    assert.equal(usingDemo(), true);
  });
});

describe("buildDemoReply", () => {
  it("includes a list and a table, and an image only when the prompt asks for one", () => {
    const plain = buildDemoReply([{ role: "user", content: "Explain JWTs" }]);
    const pictured = buildDemoReply([
      { role: "user", content: "Show an image of a workspace" },
    ]);

    assert.match(plain, /### Highlights/);
    assert.match(plain, /\| Part \| What you should see \|/);
    assert.doesNotMatch(plain, /data:image/);
    assert.match(pictured, /!\[[^\]]*\]\(data:image\/svg\+xml/);
  });
});

describe("streamAssistant", () => {
  it("streams the demo reply without calling the network", async () => {
    setEnv({});
    const original = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error("demo mode should not call fetch");
    };

    try {
      const tokens = [];
      await streamAssistant({
        messages: [{ role: "user", content: "Hello" }],
        onToken: (token) => tokens.push(token),
      });
      assert.equal(
        tokens.join(""),
        buildDemoReply([{ role: "user", content: "Hello" }]),
      );
    } finally {
      globalThis.fetch = original;
    }
  });

  it("stops when the request is aborted", async () => {
    setEnv({});
    const abort = new AbortController();
    abort.abort();
    const tokens = [];

    await streamAssistant({
      messages: [{ role: "user", content: "Hello" }],
      signal: abort.signal,
      onToken: (token) => tokens.push(token),
    });

    assert.equal(tokens.length, 0);
  });
});
