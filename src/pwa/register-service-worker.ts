export interface ServiceWorkerRegistrationState {
  supported: boolean;
  registered: boolean;
  updateAvailable: boolean;
  error: Error | null;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationState> {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    return { supported: false, registered: false, updateAvailable: false, error: null };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    let updateAvailable = Boolean(registration.waiting);

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          updateAvailable = true;
          window.dispatchEvent(new CustomEvent('duospend:pwa-update'));
        }
      });
    });

    return { supported: true, registered: true, updateAvailable, error: null };
  } catch (error) {
    return {
      supported: true,
      registered: false,
      updateAvailable: false,
      error: error instanceof Error ? error : new Error('Service worker registration failed'),
    };
  }
}
