import type { RuntimeMode } from './types';

export interface RuntimeAvailability {
  BROWSER_NATIVE: boolean;
  BROWSER_WASM: boolean;
}

export interface RuntimeDecision {
  selected: RuntimeMode | null;
  available: boolean;
  reason: 'preferred' | 'fallback' | 'unavailable';
  supported: RuntimeMode[];
}

export type AvailabilityProvider = () => RuntimeAvailability;

export type ConsentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Determines whether WebAssembly is available in the current environment.
 *
 * @returns `true` if WebAssembly is available, `false` otherwise.
 */
export function detectWasmAvailability(): boolean {
  return typeof WebAssembly !== 'undefined';
}

/**
 * Provides the default availability of supported browser runtimes.
 *
 * @returns Availability indicating that the native browser runtime is available and whether WebAssembly is available
 */
export function defaultAvailability(): RuntimeAvailability {
  return {
    BROWSER_NATIVE: true,
    BROWSER_WASM: detectWasmAvailability()
  };
}

/**
 * Provides the browser's local storage when it is accessible.
 *
 * @returns The available local storage, or `undefined` when access fails or storage is unavailable.
 */
export function defaultConsentStorage(): ConsentStorage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

const PRIORITY_ORDER: RuntimeMode[] = ['BROWSER_NATIVE', 'BROWSER_WASM'];

export const DEFAULT_CONSENT_KEY = 'centralpdf2:runtime-preference';

export interface RuntimeRouterOptions {
  availability?: AvailabilityProvider;
  consent?: ConsentStorage | null;
  consentKey?: string;
}

export class RuntimeRouter {
  private readonly availability: AvailabilityProvider;
  private readonly consent: ConsentStorage | null;
  private readonly consentKey: string;

  constructor(options: RuntimeRouterOptions = {}) {
    this.availability = options.availability ?? defaultAvailability;
    this.consent =
      'consent' in options ? (options.consent ?? null) : (defaultConsentStorage() ?? null);
    this.consentKey = options.consentKey ?? DEFAULT_CONSENT_KEY;
  }

  resolve(supported: readonly RuntimeMode[]): RuntimeDecision {
    if (!supported || supported.length === 0) {
      throw new Error('Ferramenta sem runtime suportado');
    }
    const state = this.availability();

    const toolPreferred = PRIORITY_ORDER.find((mode) => supported.includes(mode)) ?? null;

    const stored = this.readStoredPreference();
    const storedPreferred =
      stored && supported.includes(stored) && state[stored] ? stored : null;

    let selected: RuntimeMode | null =
      storedPreferred ?? (toolPreferred && state[toolPreferred] ? toolPreferred : null);

    if (!selected) {
      selected = PRIORITY_ORDER.find((mode) => supported.includes(mode) && state[mode]) ?? null;
    }

    if (!selected) {
      return {
        selected: null,
        available: false,
        reason: 'unavailable',
        supported: [...supported]
      };
    }

    const reason: RuntimeDecision['reason'] =
      selected === toolPreferred && state[toolPreferred] ? 'preferred' : 'fallback';
    return { selected, available: true, reason, supported: [...supported] };
  }

  remember(mode: RuntimeMode | null): void {
    if (!this.consent) return;
    try {
      if (mode) this.consent.setItem(this.consentKey, mode);
      else this.consent.removeItem(this.consentKey);
    } catch {
      // Armazenamento de consentimento é opcional; falhas não interrompem o roteamento.
    }
  }

  isModeAvailable(mode: RuntimeMode): boolean {
    return this.availability()[mode];
  }

  getAvailability(): RuntimeAvailability {
    return this.availability();
  }

  private readStoredPreference(): RuntimeMode | null {
    if (!this.consent) return null;
    try {
      const value = this.consent.getItem(this.consentKey);
      return value === 'BROWSER_NATIVE' || value === 'BROWSER_WASM' ? value : null;
    } catch {
      return null;
    }
  }
}