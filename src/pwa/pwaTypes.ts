export interface PushPayload {
  title: string;
  body: string;
  tag: 'cycle-log' | 'ovulation';
  url: '/cycle';
}
