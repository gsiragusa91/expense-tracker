// pdfjs-dist referencia APIs de browser (DOMMatrix, Path2D, ImageData) al evaluar
// el modulo. En el runtime Node de una funcion serverless esos globals no existen,
// asi que `import("pdfjs-dist/.../pdf.mjs")` explota con "DOMMatrix is not defined".
//
// Para extraer texto pdfjs NO usa estas APIs (los transforms se calculan con arrays
// internos), solo necesita que existan como constructores validos al cargar. Por eso
// alcanza con un polyfill minimo y sin dependencias nativas (que ademas no podriamos
// instalar en esta maquina). Implementamos DOMMatrix 2D de verdad por las dudas que
// algun path si haga matematica de matrices; Path2D/ImageData quedan como stubs.

class DOMMatrixPolyfill {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[] | string) {
    if (Array.isArray(init)) {
      if (init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      } else if (init.length === 16) {
        // matriz 4x4: tomamos los componentes 2D (m11, m12, m21, m22, m41, m42)
        this.a = init[0];
        this.b = init[1];
        this.c = init[4];
        this.d = init[5];
        this.e = init[12];
        this.f = init[13];
      }
    }
  }

  // aliases que pdfjs/DOM a veces leen
  get m11() {
    return this.a;
  }
  get m12() {
    return this.b;
  }
  get m21() {
    return this.c;
  }
  get m22() {
    return this.d;
  }
  get m41() {
    return this.e;
  }
  get m42() {
    return this.f;
  }
  get is2D() {
    return true;
  }
  get isIdentity() {
    return (
      this.a === 1 &&
      this.b === 0 &&
      this.c === 0 &&
      this.d === 1 &&
      this.e === 0 &&
      this.f === 0
    );
  }

  multiply(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
    // R = this * other  (mult. estandar de matrices affine 2D en forma 3x3)
    return new DOMMatrixPolyfill([
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.e + this.c * other.f + this.e,
      this.b * other.e + this.d * other.f + this.f
    ]);
  }

  translate(tx = 0, ty = 0): DOMMatrixPolyfill {
    return this.multiply(new DOMMatrixPolyfill([1, 0, 0, 1, tx, ty]));
  }

  scale(sx = 1, sy = sx): DOMMatrixPolyfill {
    return this.multiply(new DOMMatrixPolyfill([sx, 0, 0, sy, 0, 0]));
  }

  inverse(): DOMMatrixPolyfill {
    const det = this.a * this.d - this.b * this.c;
    if (!det) return new DOMMatrixPolyfill();
    return new DOMMatrixPolyfill([
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det
    ]);
  }
}

// Path2D / ImageData: pdfjs solo los referencia al renderizar (no al extraer texto).
// Stubs vacios alcanzan para que el modulo cargue sin ReferenceError.
class Path2DPolyfill {}
class ImageDataPolyfill {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

/**
 * Instala los globals que pdfjs necesita para cargar en Node, solo si faltan.
 * Idempotente: no pisa implementaciones reales si el runtime ya las trae.
 */
export function ensureNodeDomPolyfills(): void {
  const globals = globalThis as Record<string, unknown>;
  globals.DOMMatrix ??= DOMMatrixPolyfill;
  globals.Path2D ??= Path2DPolyfill;
  globals.ImageData ??= ImageDataPolyfill;
}
