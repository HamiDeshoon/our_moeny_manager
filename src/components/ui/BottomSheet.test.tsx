import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders dialog with ARIA accessibility attributes when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={vi.fn()} title="تست مدال">
        <p>محتوای مدال</p>
      </BottomSheet>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'bottom-sheet-title');
    expect(screen.getByText('تست مدال')).toHaveAttribute('id', 'bottom-sheet-title');
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={handleClose} title="تست کلید خروج">
        <p>محتوا</p>
      </BottomSheet>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={handleClose} title="تست دکمه بستن">
        <p>محتوا</p>
      </BottomSheet>
    );

    const closeButton = screen.getByRole('button', { name: 'بستن' });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
