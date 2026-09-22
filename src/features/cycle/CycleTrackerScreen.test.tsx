import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CycleTrackerScreen } from './CycleTrackerScreen';
import type { AppSettings, AuthUser, CycleLog, CycleSettings } from '../../types';

const mockAppSettings: AppSettings = {
  geminiApiKey: '',
  currencySymbol: 'تومان',
  partnerA: { id: 'partner_a', name: 'Hamid', avatar: '👨‍💻', color: '#3b82f6' },
  partnerB: { id: 'partner_b', name: 'Fati', avatar: '👩‍🌾', color: '#ec4899' },
};

const mockUser: AuthUser = {
  username: 'fati',
  name: 'Fati',
  partnerId: 'partner_b',
  avatar: '👩‍🌾',
};

const mockCycleSettings: CycleSettings = {
  cycleLength: 28,
  periodLength: 5,
  lutealLength: 14,
  lastPeriodStart: '2025-01-01',
};

const mockLogs: CycleLog[] = [
  {
    date: '2025-01-01',
    flow: 'medium',
    symptoms: ['cramps'],
    mood: ['neutral'],
  },
];

describe('CycleTrackerScreen', () => {
  it('renders header title and components correctly', () => {
    render(
      <CycleTrackerScreen
        settings={mockAppSettings}
        currentUser={mockUser}
        logs={mockLogs}
        cycleSettings={mockCycleSettings}
        insights={[]}
        insightsLoading={false}
        insightsError={null}
        onOpenLog={vi.fn()}
        onUpdateSettings={vi.fn().mockResolvedValue(undefined)}
        onEnableInsights={vi.fn()}
        onRefreshInsights={vi.fn()}
      />
    );

    expect(screen.getByText('چرخه و سلامت')).toBeInTheDocument();
  });

  it('allows opening settings and saving updated cycle settings', async () => {
    const handleUpdateSettings = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <CycleTrackerScreen
        settings={mockAppSettings}
        currentUser={mockUser}
        logs={mockLogs}
        cycleSettings={mockCycleSettings}
        insights={[]}
        insightsLoading={false}
        insightsError={null}
        onOpenLog={vi.fn()}
        onUpdateSettings={handleUpdateSettings}
        onEnableInsights={vi.fn()}
        onRefreshInsights={vi.fn()}
      />
    );

    // Toggle settings by clicking the settings button with aria-expanded
    const settingsButton = container.querySelector('button[aria-expanded]')!;
    expect(settingsButton).toBeInTheDocument();
    fireEvent.click(settingsButton);

    // Check settings save button is rendered
    const saveButton = screen.getByRole('button', { name: 'ذخیره تنظیمات چرخه' });
    expect(saveButton).toBeInTheDocument();

    fireEvent.click(saveButton);
    expect(handleUpdateSettings).toHaveBeenCalledWith({
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStart: '2025-01-01',
    });
  });

  it('navigates calendar months', () => {
    render(
      <CycleTrackerScreen
        settings={mockAppSettings}
        currentUser={mockUser}
        logs={mockLogs}
        cycleSettings={mockCycleSettings}
        insights={[]}
        insightsLoading={false}
        insightsError={null}
        onOpenLog={vi.fn()}
        onUpdateSettings={vi.fn().mockResolvedValue(undefined)}
        onEnableInsights={vi.fn()}
        onRefreshInsights={vi.fn()}
      />
    );

    const prevMonthButton = screen.getAllByRole('button', { name: 'ماه قبل' })[0];
    const nextMonthButton = screen.getAllByRole('button', { name: 'ماه بعد' })[0];

    expect(prevMonthButton).toBeInTheDocument();
    expect(nextMonthButton).toBeInTheDocument();

    fireEvent.click(nextMonthButton);
    fireEvent.click(prevMonthButton);
  });
});
