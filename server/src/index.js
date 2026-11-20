import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDb } from './db.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import { providerConfig, usingDemo } from './services/ai.js';

if (!(process.env.JWT_SECRET || '').trim()) {
  console.error('Set JWT_SECRET in server/.env (see server/.env.example).');
  process.exit(1);
}

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: providerConfig()?.name || 'demo' });
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((err, _req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const port = process.env.PORT || 5050;

connectDb()
  .then(() => {
    const server = app.listen(port, () => {
      const provider = providerConfig();
      const mode = provider
        ? `${provider.name} (${provider.model})`
        : 'demo (no GROQ_API_KEY)';
      console.log(`API listening on http://localhost:${port}`);
      console.log(`AI mode: ${mode}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Set PORT in server/.env to a free port.`);
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB. Is it running?');
    console.error(err.message);
    process.exit(1);
  });
