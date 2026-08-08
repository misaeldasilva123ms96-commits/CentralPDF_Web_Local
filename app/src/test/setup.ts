import '@testing-library/jest-dom/vitest';

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: () => 'blob:mock'
});
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: () => undefined
});

class DOMMatrixPolyfill {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;

  constructor(init?: string | number[] | Record<string, number> | DOMMatrixPolyfill) {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
    if (typeof init === 'string') {
      const match = /matrix\(\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\)/.exec(init);
      if (match) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = match.slice(1).map(Number);
      }
      return;
    }
    if (Array.isArray(init)) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    } else if (init) {
      this.a = init.a ?? 1;
      this.b = init.b ?? 0;
      this.c = init.c ?? 0;
      this.d = init.d ?? 1;
      this.e = init.e ?? 0;
      this.f = init.f ?? 0;
    }
  }

  private values(): [number, number, number, number, number, number] {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }

  translate(x: number, y = 0): DOMMatrixPolyfill {
    return new DOMMatrixPolyfill([
      this.a,
      this.b,
      this.c,
      this.d,
      this.e + this.a * x + this.c * y,
      this.f + this.b * x + this.d * y
    ]);
  }

  scale(sx: number, sy = sx): DOMMatrixPolyfill {
    return new DOMMatrixPolyfill([this.a * sx, this.b * sx, this.c * sy, this.d * sy, this.e, this.f]);
  }

  multiplySelf(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
    const [a, b, c, d, e, f] = this.values();
    this.a = a * other.a + c * other.b;
    this.b = b * other.a + d * other.b;
    this.c = a * other.c + c * other.d;
    this.d = b * other.c + d * other.d;
    this.e = a * other.e + c * other.f + e;
    this.f = b * other.e + d * other.f + f;
    return this;
  }

  preMultiplySelf(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
    const [a, b, c, d, e, f] = this.values();
    this.a = other.a * a + other.c * b;
    this.b = other.b * a + other.d * b;
    this.c = other.a * c + other.c * d;
    this.d = other.b * c + other.d * d;
    this.e = other.a * e + other.c * f + other.e;
    this.f = other.b * e + other.d * f + other.f;
    return this;
  }

  invertSelf(): DOMMatrixPolyfill {
    const [a, b, c, d, e, f] = this.values();
    const det = a * d - c * b;
    if (det === 0) {
      this.a = NaN;
      this.b = NaN;
      this.c = NaN;
      this.d = NaN;
      this.e = NaN;
      this.f = NaN;
      return this;
    }
    this.a = d / det;
    this.b = -b / det;
    this.c = -c / det;
    this.d = a / det;
    this.e = (c * f - d * e) / det;
    this.f = (b * e - a * f) / det;
    return this;
  }
}

if (typeof globalThis.DOMMatrix === 'undefined') {
  Object.defineProperty(globalThis, 'DOMMatrix', {
    writable: true,
    configurable: true,
    value: DOMMatrixPolyfill
  });
}