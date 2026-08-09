import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  RuntimeRouter,
  detectWasmAvailability,
  defaultConsentStorage,
  defaultAvailability,
  DEFAULT_CONSENT_KEY,
  type RuntimeAvailability,
  type ConsentStorage
} from './runtime';

const allAvailable: RuntimeAvailability = { BROWSER_NATIVE: true, BROWSER_WASM: true };
const noneAvailable: RuntimeAvailability = { BROWSER_NATIVE: false, BROWSER_WASM: false };

function routerWith(availability: RuntimeAvailability, consent?: ConsentStorage | null): RuntimeRouter {
  return new RuntimeRouter({ availability: () => availability, consent });
}

describe('RuntimeRouter', () => {
  let router: RuntimeRouter;

  beforeEach(() => {
    router = new RuntimeRouter({ availability: () => allAvailable });
  });

  it('escolhe BROWSER_NATIVE como preferido quando ambos estão disponíveis', () => {
    const decision = router.resolve(['BROWSER_WASM', 'BROWSER_NATIVE']);
    expect(decision.selected).toBe('BROWSER_NATIVE');
    expect(decision.available).toBe(true);
    expect(decision.reason).toBe('preferred');
  });

  it('resolve apenas runtimes suportados pela ferramenta', () => {
    const decision = router.resolve(['BROWSER_WASM']);
    expect(decision.selected).toBe('BROWSER_WASM');
    expect(decision.reason).toBe('preferred');
  });

  it('faz fallback explícito quando o runtime preferido está indisponível', () => {
    const decision = routerWith({ BROWSER_NATIVE: false, BROWSER_WASM: true }).resolve([
      'BROWSER_NATIVE',
      'BROWSER_WASM'
    ]);
    expect(decision.selected).toBe('BROWSER_WASM');
    expect(decision.reason).toBe('fallback');
  });

  it('retorna decision indisponível quando nenhum runtime está disponível', () => {
    const decision = routerWith(noneAvailable).resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
    expect(decision.selected).toBeNull();
    expect(decision.available).toBe(false);
    expect(decision.reason).toBe('unavailable');
    expect(decision.supported).toEqual(['BROWSER_NATIVE', 'BROWSER_WASM']);
  });

  it('rejeita ferramenta sem runtime suportado', () => {
    expect(() => router.resolve([])).toThrow(/sem runtime/);
    expect(() => router.resolve(undefined as never)).toThrow(/sem runtime/);
  });

  it('produz decisão determinística para a mesma entrada', () => {
    const first = router.resolve(['BROWSER_WASM', 'BROWSER_NATIVE']);
    const second = router.resolve(['BROWSER_WASM', 'BROWSER_NATIVE']);
    expect(first).toEqual(second);
  });

  it('usa a disponibilidade padrão sem provider e detecta WebAssembly', () => {
    const plain = new RuntimeRouter();
    expect(plain.getAvailability()).toEqual(defaultAvailability());
    expect(plain.isModeAvailable('BROWSER_NATIVE')).toBe(true);
    expect(plain.isModeAvailable('BROWSER_WASM')).toBe(detectWasmAvailability());
  });

  it('consentimento ausente: ignora tudo e não quebra o roteamento', () => {
    const withoutConsent = routerWith(allAvailable, null);
    const decision = withoutConsent.resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
    expect(decision.selected).toBe('BROWSER_NATIVE');
    expect(decision.reason).toBe('preferred');
    expect(() => withoutConsent.remember('BROWSER_WASM')).not.toThrow();
  });

  it('consentimento presente: respeita a preferência armazenada ao rotear', () => {
    const storage: Record<string, string> = { [DEFAULT_CONSENT_KEY]: 'BROWSER_WASM' };
    const consent: ConsentStorage = {
      getItem: (key) => storage[key] ?? null,
      setItem: (key, value) => {
        storage[key] = value;
      },
      removeItem: (key) => {
        delete storage[key];
      }
    };
    const withConsent = new RuntimeRouter({ availability: () => allAvailable, consent });
    const decision = withConsent.resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
    expect(decision.selected).toBe('BROWSER_WASM');
    expect(decision.reason).toBe('fallback');

    withConsent.remember('BROWSER_NATIVE');
    expect(storage[DEFAULT_CONSENT_KEY]).toBe('BROWSER_NATIVE');
    withConsent.remember(null);
    expect(storage[DEFAULT_CONSENT_KEY]).toBeUndefined();
  });

  it('storage que lança SecurityError não interrompe o roteamento', () => {
    const broken: ConsentStorage = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      removeItem: () => {
        throw new DOMException('denied', 'SecurityError');
      }
    };
    const decision = routerWith(allAvailable, broken).resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
    expect(decision.selected).toBe('BROWSER_NATIVE');
    expect(decision.reason).toBe('preferred');
  });
});

describe('Detecção de capacidade', () => {
  it('detecta WebAssembly quando presente no ambiente', () => {
    expect(detectWasmAvailability()).toBe(true);
  });

  it('reporta WebAssembly ausente quando o global é removido', () => {
    const original = globalThis.WebAssembly;
    Object.defineProperty(globalThis, 'WebAssembly', { configurable: true, value: undefined });
    try {
      expect(detectWasmAvailability()).toBe(false);
      expect(defaultAvailability().BROWSER_WASM).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'WebAssembly', { configurable: true, value: original });
    }
  });
});

describe('Armazenamento de consentimento padrão', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
  });

  it('ambiente sem localStorage retorna undefined', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
    expect(defaultConsentStorage()).toBeUndefined();
  });

  it('localStorage que lança SecurityError retorna undefined', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      }
    });
    expect(defaultConsentStorage()).toBeUndefined();
  });
});