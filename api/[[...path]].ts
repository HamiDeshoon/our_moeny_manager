import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiRouter } from '../backend/routes.js';
import { APP_VERSION } from '../src/types.js';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api', apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DuoSpend on Vercel',
    version: APP_VERSION,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || '',
  });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
