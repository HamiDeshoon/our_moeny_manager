import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

describe('Todos API Service', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches todos via getTodos', async () => {
    const mockTodos = [
      { id: 'todo-1', title: 'Buy milk', isCompleted: false, category: 'Shopping', priority: 'MEDIUM', createdBy: 'partner_a', createdAt: '2025-01-01' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockTodos,
    });

    const todos = await api.getTodos();
    expect(todos).toEqual(mockTodos);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('adds a todo via addTodo', async () => {
    const newTodoInput = { title: 'Clean room', category: 'Cleaning' as const, priority: 'HIGH' as const, createdBy: 'partner_a' };
    const createdTodo = { id: 'todo-2', ...newTodoInput, isCompleted: false, createdAt: '2025-01-01' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => createdTodo,
    });

    const result = await api.addTodo(newTodoInput);
    expect(result).toEqual(createdTodo);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newTodoInput),
      })
    );
  });

  it('toggles a todo via toggleTodo', async () => {
    const updatedTodo = { id: 'todo-1', title: 'Buy milk', isCompleted: true };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => updatedTodo,
    });

    const result = await api.toggleTodo('todo-1', true);
    expect(result).toEqual(updatedTodo);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/todos/todo-1/toggle',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isCompleted: true }),
      })
    );
  });

  it('updates a todo via updateTodo', async () => {
    const updatedTodo = { id: 'todo-1', title: 'Buy almond milk' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => updatedTodo,
    });

    const result = await api.updateTodo('todo-1', { title: 'Buy almond milk' });
    expect(result).toEqual(updatedTodo);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/todos/todo-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Buy almond milk' }),
      })
    );
  });

  it('deletes a todo via deleteTodo', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    const result = await api.deleteTodo('todo-1');
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/todos/todo-1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('clears completed todos via clearCompletedTodos', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    const result = await api.clearCompletedTodos();
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/todos/completed/clear',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});
