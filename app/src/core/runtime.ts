import type { RuntimeMode } from './types';

export interface RuntimeAvailability {
  BROWSER_NATIVE: boolean;
  BROWSER_WASM: boolean;
  LOCAL_COMPANION: boolean;
  REMOTE_OPTIONAL: boolean;
}

export interface RuntimeDecision {
  mode: RuntimeMode;
  reason: 'supported' | 'unavailable';
  availableModes: RuntimeMode[];
}

export type AvailabilityProvider = () => RuntimeAvailability;

export const DEFAULT_AVAILABILITY: RuntimeAvailability = {
  BROWSER_NATIVE: true,
  BROWSER_WASM: true,
  LOCAL_COMPANION: false,
  REMOTE_OPTIONAL: false
};

const REMOTE_CONSENT_KEY = 'centralpdf2-remote-consent';

export class RuntimeRouter {
  private readonly priorities: RuntimeMode[] = [
    'BROWSER_NATIVE',
    'BROWSER_WASM',
    'LOCAL_COMPANION',
    'REMOTE_OPTIONAL'
  ];

  constructor(
    private readonly availability: AvailabilityProvider = () => DEFAULT_AVAILABILITY,
    private readonly consent: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = window.localStorage
  ) {}

  resolve(supported: readonly RuntimeMode[]): RuntimeDecision {
    if (!supported || supported.length === 0) {
      throw new Error('Ferramenta sem runtime suportado');
    }
    const state = this.availability();
    const availableModes = this.priorities.filter(
      (mode) => supported.includes(mode) && this.isModeAvailable(mode, state)
    );
    if (availableModes.length === 0) {
      return { mode: supported[0], reason: 'unavailable', availableModes: [] };
    }
    return { mode: availableModes[0], reason: 'supported', availableModes };
  }

  isModeAvailable(mode: RuntimeMode, state?: RuntimeAvailability): boolean {
    const current = state ?? this.availability();
    if (mode === 'REMOTE_OPTIONAL') {
      return current.REMOTE_OPTIONAL && this.hasRemoteConsent();
    }
    return current[mode];
  }

  setRemoteConsent(allowed: boolean): void {
    try {
      if (allowed) this.consent.setItem(REMOTE_CONSENT_KEY, '1');
      else this.consent.removeItem(REMOTE_CONSENT_KEY);
    } catch (_) {
      /* localStorage indisponível (modo privado): consentimento não persiste */
    }
  }

  hasRemoteConsent(): boolean {
    try {
      return this.consent.getItem(REMOTE_CONSENT_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  getAvailability(): RuntimeAvailability {
    return this.availability();
  }
}