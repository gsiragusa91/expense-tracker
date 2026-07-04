import { ensureNodeDomPolyfills } from "./node-dom-polyfill";

type PdfTextItem = { str?: string; transform?: number[]; hasEOL?: boolean };
type PdfPage = {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
};
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};
type PdfJsModule = {
  getDocument: (params: {
    data: Uint8Array;
    disableFontFace: boolean;
    isEvalSupported: boolean;
  }) => { promise: Promise<PdfDocument> };
};

export async function extractPdfTextFromBytes(bytes: Uint8Array): Promise<string> {
  // pdfjs referencia DOMMatrix/Path2D/ImageData al cargar; en Node hay que instalarlas
  // ANTES del import() o el modulo explota con "DOMMatrix is not defined".
  ensureNodeDomPolyfills();

  let pdfjs: PdfJsModule;
  try {
    // Import estatico con string literal: es lo que Next/@vercel/nft puede rastrear
    // para incluir pdfjs-dist dentro de la funcion serverless. Un `new Function(import)`
    // seria opaco al bundler y no se copiaria al deploy.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore pdfjs-dist se resuelve en el build de Vercel; puede faltar en local.
    pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJsModule;
  } catch (error) {
    // No tapar el error real: si pdfjs no carga, propagar el mensaje original
    // ayuda a diagnosticar (modulo faltante vs. incompatibilidad de runtime).
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`No pude cargar el lector de PDF (pdfjs-dist): ${detail}`);
  }

  // pdfjs 5.x rechaza Buffer explicitamente aunque herede de Uint8Array.
  // Copiamos a un Uint8Array plano (constructor === Uint8Array) para satisfacerlo.
  const data = new Uint8Array(bytes);

  const doc = await pdfjs.getDocument({
    data,
    disableFontFace: true,
    isEvalSupported: false
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(reconstructLines(content.items));
  }

  return pages.join("\n");
}

// getTextContent devuelve fragmentos sueltos sin saltos de linea; unirlos todos con
// espacios (como se hacia antes) aplasta cada pagina en UNA linea y rompe los parsers,
// que matchean consumo por linea. Reconstruimos las lineas agrupando fragmentos por su
// posicion vertical (transform[5], la Y de la baseline) y respetando el flag hasEOL.
function reconstructLines(items: PdfTextItem[]): string {
  const lines: string[] = [];
  let current: string[] = [];
  let currentY: number | null = null;

  const flush = () => {
    const line = current.join(" ").replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
    current = [];
  };

  for (const item of items) {
    const y = Array.isArray(item.transform) ? item.transform[5] : null;
    // Cambio de baseline mayor a ~2 unidades => fila nueva.
    if (currentY !== null && y !== null && Math.abs(y - currentY) > 2) {
      flush();
    }
    if (item.str) current.push(item.str);
    if (y !== null) currentY = y;
    if (item.hasEOL) {
      flush();
      currentY = null;
    }
  }
  flush();

  return lines.join("\n");
}
