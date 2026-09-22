import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useListManager } from './useListManager';

interface TestItem {
  id: string;
  title: string;
  done?: boolean;
}

describe('useListManager', () => {
  it('loads items on mount', async () => {
    const mockItems: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];
    const fetchItems = vi.fn().mockResolvedValue(mockItems);

    const { result } = renderHook(() => useListManager<TestItem>({ fetchItems }));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual(mockItems);
    expect(fetchItems).toHaveBeenCalledTimes(1);
  });

  it('handles error on loadItems', async () => {
    const error = new Error('Network error');
    const fetchItems = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() => useListManager<TestItem>({ fetchItems, onError }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(onError).toHaveBeenCalledWith(error, 'load');
  });

  it('optimistically updates item and handles success', async () => {
    const mockItems: TestItem[] = [{ id: '1', title: 'Item 1', done: false }];
    const fetchItems = vi.fn().mockResolvedValue(mockItems);
    const apiCall = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useListManager<TestItem>({ fetchItems }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.updateItemOptimistic(
        (prev) => prev.map((item) => (item.id === '1' ? { ...item, done: true } : item)),
        apiCall
      );
    });

    expect(result.current.items).toEqual([{ id: '1', title: 'Item 1', done: true }]);
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('rolls back on optimistic update failure', async () => {
    const initialItems: TestItem[] = [{ id: '1', title: 'Item 1', done: false }];
    const fetchItems = vi.fn().mockResolvedValue(initialItems);
    const error = new Error('Update failed');
    const apiCall = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() => useListManager<TestItem>({ fetchItems, onError }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.updateItemOptimistic(
        (prev) => prev.map((item) => (item.id === '1' ? { ...item, done: true } : item)),
        apiCall
      );
    });

    expect(onError).toHaveBeenCalledWith(error, 'update');
    expect(fetchItems).toHaveBeenCalledTimes(2); // Initial fetch + reload on error
    expect(result.current.items).toEqual(initialItems);
  });

  it('adds new item via addItem', async () => {
    const initialItems: TestItem[] = [{ id: '1', title: 'Item 1' }];
    const fetchItems = vi.fn().mockResolvedValue(initialItems);
    const newItem: TestItem = { id: '2', title: 'Item 2' };
    const apiCall = vi.fn().mockResolvedValue(newItem);

    const { result } = renderHook(() => useListManager<TestItem>({ fetchItems }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    let added: TestItem | undefined;
    await act(async () => {
      added = await result.current.addItem(apiCall);
    });

    expect(added).toEqual(newItem);
    expect(result.current.items).toEqual([newItem, initialItems[0]]);
  });
});
