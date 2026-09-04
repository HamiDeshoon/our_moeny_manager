export type AppTab = 'home' | 'analytics' | 'cycle' | 'profile';
export type HomeView = 'dashboard' | 'transactions';

export type ActiveModal =
  | { kind: 'none' }
  | { kind: 'transaction-create'; source: 'manual' | 'receipt' | 'voice' }
  | { kind: 'transaction-edit'; transactionId: string }
  | { kind: 'transaction-delete'; transactionId: string }
  | { kind: 'cycle-log'; date: string }
  | { kind: 'settings' }
  | { kind: 'login' }
  | { kind: 'csv-import' };

export interface ModalController {
  activeModal: ActiveModal;
  openModal: (modal: Exclude<ActiveModal, { kind: 'none' }>) => void;
  closeModal: () => void;
}
