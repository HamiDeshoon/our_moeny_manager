import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { Server } from 'http';
import { apiRouter } from './routes';
import { db } from './db';
import { TodoItem } from '../src/types';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === 'object' && address !== null) {
        baseUrl = `http://localhost:${address.port}/api`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Todos API Routes', () => {
  const authHeaders = {
    'x-auth-user': 'hamid',
    'Content-Type': 'application/json',
  };

  it('GET /todos requires authentication header', async () => {
    const res = await fetch(`${baseUrl}/todos`);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Authentication required. Please log in first.');
  });

  it('GET /todos returns todo list for authenticated user', async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      headers: authHeaders,
    });
    expect(res.status).toBe(200);
    const todos = await res.json();
    expect(Array.isArray(todos)).toBe(true);
  });

  it('POST /todos returns 400 if title is missing', async () => {
    const res = await fetch(`${baseUrl}/todos`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ category: 'Cleaning' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Title is required');
  });

  it('POST /todos creates a new todo item successfully', async () => {
    const payload = {
      title: 'Test Todo Item',
      description: 'Testing todo creation',
      priority: 'HIGH',
      category: 'Cleaning',
      assignedTo: 'partner_a',
    };
    const res = await fetch(`${baseUrl}/todos`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const todo: TodoItem = await res.json();
    expect(todo.id).toBeDefined();
    expect(todo.title).toBe('Test Todo Item');
    expect(todo.createdBy).toBe('hamid');
    expect(todo.isCompleted).toBe(false);

    // Clean up created todo
    await db.deleteTodo(todo.id);
  });

  it('PATCH /todos/:id updates an existing todo item', async () => {
    const newTodo = await db.addTodo({
      title: 'Patch Test Todo',
      priority: 'MEDIUM',
      category: 'Shopping',
      createdBy: 'hamid',
    });

    const res = await fetch(`${baseUrl}/todos/${newTodo.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isCompleted: true }),
    });
    expect(res.status).toBe(200);
    const updated: TodoItem = await res.json();
    expect(updated.id).toBe(newTodo.id);
    expect(updated.isCompleted).toBe(true);
    expect(updated.completedBy).toBe('hamid');

    // Clean up
    await db.deleteTodo(newTodo.id);
  });

  it('PATCH /todos/:id returns 404 for non-existent todo', async () => {
    const res = await fetch(`${baseUrl}/todos/non-existent-id`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Todo not found');
  });

  it('DELETE /todos/:id deletes a todo item', async () => {
    const todoToDelete = await db.addTodo({
      title: 'Delete Test Todo',
      priority: 'LOW',
      category: 'Other',
      createdBy: 'hamid',
    });

    const res = await fetch(`${baseUrl}/todos/${todoToDelete.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const todosAfter = await db.getTodos();
    expect(todosAfter.some((t) => t.id === todoToDelete.id)).toBe(false);
  });
});
