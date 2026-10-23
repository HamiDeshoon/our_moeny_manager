import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryCards } from './SummaryCards';
import { AppSettings, HouseholdSummary } from '../types';

const mockSettings: AppSettings = {
  geminiApiKey: '',
  currencySymbol: 'تومان',
  isRtl: true,
  useJalaliDate: true,
  partnerA: { id: 'partner_a', name: 'کاربر اول', avatar: '👨‍💼', color: '#0284c7' },
  partnerB: { id: 'partner_b', name: 'کاربر دوم', avatar: '👩‍⚕️', color: '#16a34a' },
};

const mockSummary: HouseholdSummary = {
  partnerATotalPaid: 3000000,
  partnerBTotalPaid: 7000000,
};

describe('SummaryCards Component', () => {
  it('renders total household spending and partner contribution percentages correctly', () => {
    render(<SummaryCards summary={mockSummary} settings={mockSettings} />);

    expect(screen.getByText('کل هزینه‌های خانه')).toBeInTheDocument();
    expect(screen.getByText(/10,000,000/)).toBeInTheDocument();
    expect(screen.getAllByText(/کاربر اول/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/کاربر دوم/).length).toBeGreaterThan(0);
  });
});
