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

const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<PdfJsModule>;

export async function extractPdfTextFromBytes(bytes: Uint8Array): Promise<string> {
  let pdfjs: PdfJsModule;
  try {
    pdfjs = await dynamicImport("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    throw new Error(
      "Falta instalar pdfjs-dist para leer PDFs. Ejecuta npm install cuando el registry este disponible."
    );
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
