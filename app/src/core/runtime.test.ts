import { describe, expect, it, beforeEach } from 'vitest';
import {
  RuntimeRouter,
  DEFAULT_AVAILABILITY,
  type RuntimeAvailability
} from './runtime';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const allAvailable: RuntimeAvailability = {
  BROWSER_NATIVE: true,
  BROWSER_WASM: true,
  LOCAL_COMPANION: true,
  REMOTE_OPTIONAL: false
};

describe('RuntimeRouter', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('escolhe o primeiro runtime suportado pela ordem de prioridade', () => {
    const router = new RuntimeRouter(() => allAvailable, storage);
    const decision = router.resolve(['BROWSER_WASM', 'BROWSER_NATIVE']);
    expect(decision.mode).toBe('BROWSER_NATIVE');
    expect(decision.reason).toBe('supported');
  });

  it('resolve apenas runtimes suportados pela ferramenta', () => {
    const router = new RuntimeRouter(() => allAvailable, storage);
    const decision = router.resolve(['BROWSER_WASM']);
    expect(decision.mode).toBe('BROWSER_WASM');
  });

  it('faz fallback para próximo modo disponível quando o preferido está indisponível', () => {
    const unavailable: RuntimeAvailability = { ...allAvailable, BROWSER_NATIVE: false };
    const router = new RuntimeRouter(() => unavailable, storage);
    const decision = router.resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
    expect(decision.mode).toBe('BROWSER_WASM');
  });

  it('retorna unavailable quando nenhum runtime está disponível', () => {
    const none: RuntimeAvailability = {
      BROWSER_NATIVE: false,
      BROWSER_WASM: false,
      LOCAL_COMPANION: false,
      REMOTE_OPTIONAL: false
    };
    const router = new RuntimeRouter(() => none, storage);
    const decision = router.resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
    expect(decision.reason).toBe('unavailable');
    expect(decision.availableModes).toEqual([]);
  });

  it('rejeita ferramenta sem seletor de runtime', () => {
    const router = new RuntimeRouter(() => allAvailable, storage);
    expect(() => router.resolve([])).toThrow(/sem runtime/);
  });

  it('REMOTE_OPTIONAL fica indisponível sem consentimento', () => {
    const withRemote: RuntimeAvailability = { ...allAvailable, REMOTE_OPTIONAL: true };
    const router = new RuntimeRouter(() => withRemote, storage);
    expect(router.resolve(['REMOTE_OPTIONAL']).reason).toBe('unavailable');
    expect(router.hasRemoteConsent()).toBe(false);
  });

it('REMOTE_OPTIONAL fica disponível após consentimento explícito', () => {
    const withRemote: RuntimeAvailability = { ...allAvailable, REMOTE_OPTIONAL: true };
    const router = new RuntimeRouter(() => withRemote, storage);
    expect(router.isModeAvailable('REMOTE_OPTIONAL')).toBe(false);
    router.setRemoteConsent(true);
    expect(router.hasRemoteConsent()).toBe(true);
    expect(router.isModeAvailable('REMOTE_OPTIONAL')).toBe(true);
    const decision = router.resolve(['REMOTE_OPTIONAL']);
    expect(decision.mode).toBe('REMOTE_OPTIONAL');
    expect(decision.reason).toBe('supported');
  });

  it('revoga o consentimento remoto', () => {
    const withRemote: RuntimeAvailability = { ...allAvailable, REMOTE_OPTIONAL: true };
    const router = new RuntimeRouter(() => withRemote, storage);
    router.setRemoteConsent(true);
    router.setRemoteConsent(false);
    expect(router.hasRemoteConsent()).toBe(false);
    expect(router.isModeAvailable('REMOTE_OPTIONAL')).toBe(false);
  });

  it('usa disponibilidade padrão (LOCAL e REMOTE desligados) quando não há provider', () => {
    const router = new RuntimeRouter(undefined, storage);
    expect(router.getAvailability()).toEqual(DEFAULT_AVAILABILITY);
    expect(router.isModeAvailable('LOCAL_COMPANION')).toBe(false);
    expect(router.isModeAvailable('BROWSER_NATIVE')).toBe(true);
  });

  it('trata localStorage indisponível sem lançar', () => {
    const broken: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); }
    };
    const router = new RuntimeRouter(undefined, broken);
    router.setRemoteConsent(true);
    expect(router.hasRemoteConsent()).toBe(false);
  });
});