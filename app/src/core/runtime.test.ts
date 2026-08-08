import { describe, expect, it, beforeEach } from 'vitest';
import { RuntimeRouter, DEFAULT_AVAILABILITY, type RuntimeAvailability } from './runtime';

const allAvailable: RuntimeAvailability = { BROWSER_NATIVE: true, BROWSER_WASM: true };
const noneAvailable: RuntimeAvailability = { BROWSER_NATIVE: false, BROWSER_WASM: false };

describe('RuntimeRouter', () => {
  let router: RuntimeRouter;

  beforeEach(() => {
    router = new RuntimeRouter(() => allAvailable);
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
    const routerWasm = new RuntimeRouter(() => ({ BROWSER_NATIVE: false, BROWSER_WASM: true }));
    const decision = routerWasm.resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
    expect(decision.selected).toBe('BROWSER_WASM');
    expect(decision.reason).toBe('fallback');
  });

  it('retorna decision indisponível quando nenhum runtime está disponível', () => {
    const routerNone = new RuntimeRouter(() => noneAvailable);
    const decision = routerNone.resolve(['BROWSER_NATIVE', 'BROWSER_WASM']);
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

  it('usa a disponibilidade padrão quando não há provider', () => {
    const plain = new RuntimeRouter();
    expect(plain.getAvailability()).toEqual(DEFAULT_AVAILABILITY);
    expect(plain.isModeAvailable('BROWSER_NATIVE')).toBe(true);
    expect(plain.isModeAvailable('BROWSER_WASM')).toBe(true);
  });
});