import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { apiRouter } from './routes.js';

describe('Auth Security - Login Endpoint', () => {
  let app: express.Express;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AUTH_HAMID_HASH;
    delete process.env.AUTH_FATI_HASH;
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('fails authentication when env hashes are not set', async () => {
    const res = await fetch('http://localhost:0', { method: 'POST' }).catch(() => null);
    // Express handler directly testing via mock req/res
    const req = { body: { username: 'hamid', password: 'password123' } } as any;
    let resStatus = 0;
    let resJson: any = null;
    const resObj = {
      status: (code: number) => {
        resStatus = code;
        return resObj;
      },
      json: (data: any) => {
        resJson = data;
        return resObj;
      },
    } as any;

    // Trigger auth login route directly or via server
    const server = app.listen(0);
    const address = server.address() as any;
    const port = address.port;

    try {
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'hamid', password: 'password123' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('نام کاربری یا رمز عبور اشتباه است');
    } finally {
      server.close();
    }
  });

  it('succeeds authentication when valid hash env var is provided and password matches', async () => {
    const password = 'mySecretPassword123';
    const hash = await bcrypt.hash(password, 10);
    process.env.AUTH_HAMID_HASH = hash;

    const server = app.listen(0);
    const address = server.address() as any;
    const port = address.port;

    try {
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'hamid', password }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.username).toBe('hamid');
    } finally {
      server.close();
    }
  });

  it('fails authentication when valid hash env var is provided but password is wrong', async () => {
    const password = 'mySecretPassword123';
    const hash = await bcrypt.hash(password, 10);
    process.env.AUTH_HAMID_HASH = hash;

    const server = app.listen(0);
    const address = server.address() as any;
    const port = address.port;

    try {
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'hamid', password: 'wrongpassword' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('نام کاربری یا رمز عبور اشتباه است');
    } finally {
      server.close();
    }
  });
});
