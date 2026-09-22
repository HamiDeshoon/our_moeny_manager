import { useState, useEffect, useCallback } from 'react';

export interface UseListManagerOptions<T> {
  fetchItems: () => Promise<T[]>;
  onError?: (error: unknown, action: string) => void;
}

export function useListManager<T>({
  fetchItems,
  onError,
}: UseListManagerOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchItems();
      setItems(data);
    } catch (err) {
      if (onError) {
        onError(err, 'load');
      } else {
        console.error('Failed to load list items', err);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchItems, onError]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateItemOptimistic = useCallback(
    async (
      updateFn: (prev: T[]) => T[],
      apiCall: () => Promise<unknown>
    ) => {
      setItems(updateFn);
      try {
        await apiCall();
      } catch (err) {
        if (onError) {
          onError(err, 'update');
        } else {
          console.error('Failed to perform list operation', err);
        }
        await loadItems();
      }
    },
    [loadItems, onError]
  );

  const addItem = useCallback(
    async (apiCall: () => Promise<T>) => {
      try {
        const newItem = await apiCall();
        setItems((prev) => [newItem, ...prev]);
        return newItem;
      } catch (err) {
        if (onError) {
          onError(err, 'add');
        } else {
          console.error('Failed to add item', err);
        }
        throw err;
      }
    },
    [onError]
  );

  return {
    items,
    setItems,
    loading,
    loadItems,
    updateItemOptimistic,
    addItem,
  };
}
