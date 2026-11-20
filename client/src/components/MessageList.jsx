import { useEffect, useRef, useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { userBubbleColor } from "../theme";
import RichContent from "./RichContent";

const SUGGESTIONS = [
  { title: "Compare options", text: "Compare REST and GraphQL in a table." },
  {
    title: "Make a list",
    text: "Give me a short learning plan for React as a list.",
  },
  {
    title: "Show an image",
    text: "Describe a calm workspace and include one example image.",
  },
  {
    title: "Explain simply",
    text: "Explain JWTs in plain language with a few bullet points.",
  },
];

const ACTIONS = [
  { label: "Explain more", prompt: "Explain that in more detail." },
  { label: "Simplify", prompt: "Explain that more simply." },
  { label: "Make a table", prompt: "Turn that into a comparison table." },
  {
    label: "Show an image",
    prompt: "Show one example image that fits this topic.",
  },
];

function TypingDots() {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.7,
        py: 1.1,
        "@keyframes devgptBounce": {
          "0%, 80%, 100%": { opacity: 0.25 },
          "40%": { opacity: 1 },
        },
      }}
    >
      {[0, 1, 2].map((dot) => (
        <Box
          key={dot}
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "text.secondary",
            animation: "devgptBounce 1.2s infinite",
            animationDelay: `${dot * 0.15}s`,
          }}
        />
      ))}
    </Box>
  );
}

function Message({ message, streaming, showActions, onAction }) {
  const isUser = message.role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 2.5,
      }}
    >
      <Box sx={{ maxWidth: isUser ? "min(75%, 640px)" : "100%", minWidth: 0 }}>
        <Box
          sx={{
            px: isUser ? 2 : 0,
            py: isUser ? 1.2 : 0,
            borderRadius: 5,
            bgcolor: isUser
              ? (theme) => userBubbleColor(theme.palette.mode)
              : "transparent",
          }}
        >
          {isUser ? (
            <Typography
              sx={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                lineHeight: 1.6,
              }}
            >
              {message.content}
            </Typography>
          ) : message.content ? (
            <RichContent text={message.content} />
          ) : streaming ? (
            <TypingDots />
          ) : null}
          {!isUser && message.content && streaming && (
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: 8,
                height: 16,
                ml: 0.4,
                bgcolor: "text.primary",
                verticalAlign: "text-bottom",
                animation: "devgptBlink 1s steps(1) infinite",
                "@keyframes devgptBlink": { "50%": { opacity: 0 } },
              }}
            />
          )}
        </Box>
        {showActions && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
            {ACTIONS.map((action) => (
              <Chip
                key={action.label}
                label={action.label}
                variant="outlined"
                clickable
                onClick={() => onAction(action.prompt)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function MessageList({
  messages,
  streaming,
  loading,
  greeting,
  onSuggest,
  onAction,
}) {
  const scroller = useRef(null);
  const stick = useRef(true);

  function handleScroll() {
    const element = scroller.current;
    if (!element) return;
    stick.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 140;
  }

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user") stick.current = true;
    if (stick.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [messages]);

  const lastIndex = messages.length - 1;

  return (
    <Box
      ref={scroller}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 820,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: 3,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <Box sx={{ m: "auto" }}>
            <TypingDots />
          </Box>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              m: "auto",
              width: "100%",
              maxWidth: 680,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "1.8rem", md: "2.15rem" },
                fontWeight: 650,
                letterSpacing: "-0.03em",
              }}
            >
              {greeting
                ? `What can I help with, ${greeting}?`
                : "What can I help with?"}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3.5 }}>
              Ask anything, or start from one of these.
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.25,
                textAlign: "left",
              }}
            >
              {SUGGESTIONS.map((item) => (
                <Box
                  key={item.title}
                  component="button"
                  type="button"
                  disabled={streaming}
                  onClick={() => onSuggest(item.text)}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    color: "inherit",
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                    transition: "border-color 0.15s ease",
                    "&:hover": { borderColor: "primary.main" },
                    "&:disabled": { opacity: 0.6, cursor: "default" },
                  }}
                >
                  <Typography sx={{ fontWeight: 650, mb: 0.4 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          messages.map((message, index) => (
            <Message
              key={message.id}
              message={message}
              streaming={streaming && index === lastIndex}
              showActions={
                !streaming &&
                index === lastIndex &&
                message.role === "assistant" &&
                Boolean(message.content)
              }
              onAction={onAction}
            />
          ))
        )}
      </Box>
    </Box>
  );
}
