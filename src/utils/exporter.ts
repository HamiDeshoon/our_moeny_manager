import { Transaction, AppSettings } from '../types';
import { formatJalaliDate, getJalaliMonthYear } from './formatters';

export function exportToCSV(
  transactions: Transaction[],
  settings: AppSettings,
  monthStr: string
) {
  const partnerAPaid = transactions.filter(t => t.paidBy === settings.partnerA.id).reduce((s, t) => s + t.amount, 0);
  const partnerBPaid = transactions.filter(t => t.paidBy === settings.partnerB.id).reduce((s, t) => s + t.amount, 0);
  const jalaliMonth = getJalaliMonthYear(monthStr);

  const headers = [
    'Date (Gregorian)',
    'Date (Jalali)',
    'Title / Description',
    'Category',
    'Paid By',
    `Total Amount (${settings.currencySymbol})`,
    'Vendor',
    'Notes'
  ];

  const rows = transactions.map(tx => {
    const paidByName = tx.paidBy === settings.partnerA.id ? settings.partnerA.name : settings.partnerB.name;
    const jalali = formatJalaliDate(tx.date);
    
    const cleanTitle = `"${(tx.title || '').replace(/"/g, '""')}"`;
    const cleanVendor = `"${(tx.vendor || '').replace(/"/g, '""')}"`;
    const cleanNotes = `"${(tx.notes || '').replace(/"/g, '""')}"`;

    return [
      tx.date,
      `"${jalali}"`,
      cleanTitle,
      `"${tx.category}"`,
      `"${paidByName}"`,
      tx.amount,
      cleanVendor,
      cleanNotes
    ].join(',');
  });

  const summaryHeader = [
    '--- HOUSEHOLD EXPENSE REPORT ---',
    `Month: ${monthStr} (${jalaliMonth})`,
    `Total Joint Spent: ${partnerAPaid + partnerBPaid} ${settings.currencySymbol}`,
    `${settings.partnerA.name} Total Paid: ${partnerAPaid} ${settings.currencySymbol}`,
    `${settings.partnerB.name} Total Paid: ${partnerBPaid} ${settings.currencySymbol}`,
    'Mode: Unified Married Household (No Debt Settlements)'
  ].join(',');

  const csvContent = '\uFEFF' + summaryHeader + '\n\n' + headers.join(',') + '\n' + rows.join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Household_Expenses_${monthStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function triggerPDFPrint() {
  window.print();
}
