import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../backend/db.js';
import { TodoItem } from '../types.js';

describe('Todos & Chores DB operations', () => {
  it('should add a new todo item and retrieve it', async () => {
    const todoData = {
      title: 'Clean balcony',
      description: 'Water plants and sweep floor',
      category: 'Cleaning' as const,
      priority: 'HIGH' as const,
      dueDate: '2026-03-30',
      assignedTo: 'partner_a',
      createdBy: 'partner_a',
    };

    const created = await db.addTodo(todoData);

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Clean balcony');
    expect(created.isCompleted).toBe(false);
    expect(created.createdAt).toBeDefined();

    const todos = await db.getTodos();
    const found = todos.find((t) => t.id === created.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Clean balcony');
    expect(found?.category).toBe('Cleaning');
  });

  it('should update todo completion status correctly', async () => {
    const todo = await db.addTodo({
      title: 'Pay electric bill',
      category: 'Finance' as const,
      priority: 'URGENT' as const,
      createdBy: 'partner_b',
    });

    expect(todo.isCompleted).toBe(false);

    const updated = await db.updateTodo(todo.id, { isCompleted: true }, 'partner_b');

    expect(updated).not.toBeNull();
    expect(updated?.isCompleted).toBe(true);
    expect(updated?.completedBy).toBe('partner_b');
    expect(updated?.completedAt).toBeDefined();

    // Toggle back to incomplete
    const uncompleted = await db.updateTodo(todo.id, { isCompleted: false });
    expect(uncompleted?.isCompleted).toBe(false);
  });

  it('should delete a todo item', async () => {
    const todo = await db.addTodo({
      title: 'Temporary task to delete',
      category: 'Other' as const,
      priority: 'LOW' as const,
      createdBy: 'partner_a',
    });

    const success = await db.deleteTodo(todo.id);
    expect(success).toBe(true);

    const todos = await db.getTodos();
    const found = todos.find((t) => t.id === todo.id);
    expect(found).toBeUndefined();
  });
});
