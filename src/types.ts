
export const APP_VERSION = '1.4.0';
export const MIN_TRANSACTION_AMOUNT_TOMAN = 30000;

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type Category =
  | 'Groceries'
  | 'Dining & Takeout'
  | 'Rent & Mortgage'
  | 'Utilities & Internet'
  | 'Household & Supplies'
  | 'Entertainment & Subscriptions'
  | 'Travel & Transport'
  | 'Healthcare & Wellness'
  | 'Shopping & Personal'
  | 'Income & Salary'
  | 'Internal Transfer'
  | 'Other';

export interface PartnerProfile {
  id: string; // 'partner_a' | 'partner_b'
  name: string;
  avatar: string; // emoji or image url
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: Category;
  paidBy: string; // partner id (e.g. 'partner_a')
  date: string; // YYYY-MM-DD
  notes?: string;
  vendor?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringDay?: number; // Day of month e.g. 1-31
  recurringFrequency?: 'MONTHLY' | 'YEARLY';
  createdAt: string;
}

export interface Budget {
  category: Category;
  monthlyLimit: number;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  category: Category;
  paidBy: string; // default payer partner_id
  dueDateDay: number; // 1-31
  isPaidThisMonth: boolean;
  autopay: boolean;
  provider?: string;
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  category: Category;
  paidBy: string; // partner id
  startDate: string; // YYYY-MM-DD
  interval: 'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'YEARLY';
  isActive: boolean;
  notes?: string;
}

export interface AuthUser {
  username: string; // 'hamid' | 'fati'
  name: string; // 'Hamid' | 'Fati'
  partnerId: string; // 'partner_a' | 'partner_b'
  avatar: string; // '👨‍💻' | '👩‍🌾'
}

export interface MonthTrendData {
  monthKey: string; // e.g. "2026-05"
  monthLabel: string; // e.g. "اردیبهشت" or "May 2026"
  totalExpense: number;
  totalIncome: number;
  totalSavings: number;
  savingsRatePct: number;
  partnerAExpense: number;
  partnerBExpense: number;
  categoryBreakdown: Record<string, number>;
}

export interface AIParsedSheetResult {
  detectedColumns: string[];
  totalRowsProcessed: number;
  currencyDetected: string;
  notes: string;
  transactions: Array<{
    title: string;
    amount: number;
    type: TransactionType;
    category: Category;
    paidBy: string; // partner_a or partner_b
    date: string; // YYYY-MM-DD
    vendor?: string;
    notes?: string;
  }>;
}

export interface AppSettings {
  geminiApiKey: string; // optional override
  currencySymbol: string;
  partnerA: PartnerProfile;
  partnerB: PartnerProfile;
  isRtl?: boolean;
  useJalaliDate?: boolean; // Display Shamsi (Jalali) dates
  noSettlementsMode?: boolean; // Unified household mode (no debt tracking)
  storageMode?: 'postgresql' | 'local_file';
  appVersion?: string;
  gitCommitSha?: string;
  minTransactionAmount?: number;
}

export interface AIParsedVoice {
  actionType?: 'LOG_EXPENSE' | 'SET_BUDGET' | 'ADD_RECURRING' | 'ADD_BILL';
  title: string;
  amount: number;
  category: Category;
  paidBy: string;
  date: string;
  vendor?: string;
  confidenceNotes?: string;
  monthlyLimit?: number;
  interval?: 'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'YEARLY';
  dueDateDay?: number;
  autopay?: boolean;
}

export interface AIScanReceipt {
  vendor: string;
  date: string;
  totalAmount: number;
  category: Category;
  taxAmount?: number;
  items: Array<{ name: string; price: number }>;
  suggestedPayer?: string;
  confidenceNotes?: string;
}

export interface AIInsightResponse {
  summary: string;
  keyInsights: string[];
  anomalies: string[];
  savingTips: string[];
  suggestedBudgets?: Array<{ category: Category; suggestedLimit: number; reason: string }>;
}

export interface HouseholdSummary {
  partnerATotalPaid: number;
  partnerBTotalPaid: number;
}

export interface IgnoredTransactionResponse {
  ignored: true;
  reason: string;
  minAmount: number;
}

// ──────────────────────────────────────────────
// Menstrual Cycle & Period Calendar Types
// ──────────────────────────────────────────────

export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export interface CycleLog {
  date: string; // YYYY-MM-DD
  flow?: FlowIntensity;
  symptoms?: string[];
  mood?: string[];
  painLevel?: number; // 0-5
  notes?: string;
  isPeriodStart?: boolean;
  isPeriodEnd?: boolean;
  temperature?: number;
}

export interface CycleSettings {
  cycleLength: number; // default: 28 days
  periodLength: number; // default: 5 days
  lutealLength: number; // default: 14 days
  lastPeriodStart?: string; // YYYY-MM-DD
  trackPartnerId?: string; // partner_b
  partnerNotes?: string;
}

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface DayCycleInfo {
  phase: CyclePhase | 'normal';
  isPeriod: boolean;
  isPredictedPeriod: boolean;
  isFertile: boolean;
  isOvulation: boolean;
  dayOfCycle?: number;
  log?: CycleLog;
}
