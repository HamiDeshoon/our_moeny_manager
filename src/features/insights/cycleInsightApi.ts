import type { CycleInsight, CycleLog } from '../../types';

export async function getCycleInsights(cycleDays: CycleLog[]): Promise<CycleInsight[]> {
  const user = localStorage.getItem('duospend_auth_user');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) {
    try { headers['x-auth-user'] = JSON.parse(user).username; } catch { /* request will receive the server auth response */ }
  }
  const response = await fetch('/api/ai/cycle-insights', { method: 'POST', headers, body: JSON.stringify({ cycleDays }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not generate a cycle insight.');
  return data.insights as CycleInsight[];
}
