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

export const DEFAULT_AVAILABILITY: RuntimeAvailability = {
  BROWSER_NATIVE: true,
  BROWSER_WASM: true
};

const PRIORITY_ORDER: RuntimeMode[] = ['BROWSER_NATIVE', 'BROWSER_WASM'];

export class RuntimeRouter {
  constructor(private readonly availability: AvailabilityProvider = () => DEFAULT_AVAILABILITY) {}

  resolve(supported: readonly RuntimeMode[]): RuntimeDecision {
    if (!supported || supported.length === 0) {
      throw new Error('Ferramenta sem runtime suportado');
    }
    const state = this.availability();
    const awaited = PRIORITY_ORDER.filter(
      (mode) => supported.includes(mode) && state[mode]
    );
    if (awaited.length === 0) {
      return {
        selected: null,
        available: false,
        reason: 'unavailable',
        supported: [...supported]
      };
    }
    const selected = awaited[0];
    const reason: RuntimeDecision['reason'] =
      selected === 'BROWSER_WASM' && supported.includes('BROWSER_NATIVE')
        ? 'fallback'
        : 'preferred';
    return { selected, available: true, reason, supported: [...supported] };
  }

  isModeAvailable(mode: RuntimeMode): boolean {
    return this.availability()[mode];
  }

  getAvailability(): RuntimeAvailability {
    return this.availability();
  }
}