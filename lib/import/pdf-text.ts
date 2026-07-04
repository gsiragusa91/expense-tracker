import { ensureNodeDomPolyfills } from "./node-dom-polyfill";

type PdfTextItem = { str?: string };
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

  const doc = await pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    isEvalSupported: false
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  return pages.join("\n");
}
