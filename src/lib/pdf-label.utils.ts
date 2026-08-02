import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bwipjs from "bwip-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export function sanitizeForPdf(text: string): string {
  const decomposed = text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "");

  return [...decomposed]
    .map((ch) => ((ch.codePointAt(0) ?? 0) > 0xFF ? "?" : ch))
    .join("");
}

export function wrapText(
  text: string,
  f: { widthOfTextAtSize: (t: string, s: number) => number },
  fontSize: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (f.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export type GroupLabelData = {
  groupPackageCode: string;
  destinationArea: string;
  memberSummary: string;
  totalWeight: string;
  memberCount: number;
};

export async function generateGroupLabelPdf(data: GroupLabelData): Promise<Buffer> {
  const trackingNumber = data.groupPackageCode;
  const customerName = sanitizeForPdf("GROUP PACKAGE");
  const streetAddress = sanitizeForPdf(data.destinationArea || "N/A");
  const countryCity = sanitizeForPdf("W2 GROUP DISPATCH");
  const shippingType = sanitizeForPdf("GROUP");
  const packageWeight = sanitizeForPdf(data.totalWeight || "N/A");
  const priorityCode = sanitizeForPdf(String(data.memberCount));
  const customerId = sanitizeForPdf(data.groupPackageCode);
  const approvalDate = new Date().toLocaleDateString("en-GB");
  const notesText = sanitizeForPdf(data.memberSummary);

  const qrCodePng: Buffer = await bwipjs.toBuffer({
    bcid: "qrcode",
    text: trackingNumber,
    scale: 3,
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const templatePath = join(__dirname, "../assets/Edoshop-template.pdf");
  const templateBytes = await readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await pdfDoc.embedPng(qrCodePng);

  const page = pdfDoc.getPages()[0];
  const { width: W } = page.getSize();
  const black = rgb(0, 0, 0);

  const centerX = (boxX: number, boxW: number, text: string, f: typeof font, size: number) =>
    boxX + (boxW - f.widthOfTextAtSize(text, size)) / 2;

  page.drawText(shippingType, { x: 185, y: 345, size: 10, font: fontBold, color: black });
  page.drawText(customerName, { x: 80, y: 304, size: 8, font: fontBold, color: black, maxWidth: 200 });
  page.drawText(streetAddress, { x: 80, y: 289, size: 8, font, color: black, maxWidth: 200 });
  page.drawText(countryCity, { x: 80, y: 274, size: 8, font, color: black, maxWidth: 200 });

  const leftBoxX = 168;
  const leftBoxW = 48;
  const rightBoxX = 224;
  const rightBoxW = 42;

  page.drawText(customerId, { x: 60, y: 247, size: 9, font: fontBold, color: black });
  page.drawText(packageWeight, {
    x: centerX(leftBoxX, leftBoxW, packageWeight, fontBold, 7),
    y: 248,
    size: 8,
    font: fontBold,
    color: black,
  });
  page.drawText(priorityCode, {
    x: centerX(rightBoxX, rightBoxW, priorityCode, fontBold, 7),
    y: 248,
    size: 8,
    font: fontBold,
    color: black,
  });

  if (notesText) {
    const noteBoxX = 32;
    const noteBoxMaxW = 318;
    const noteFontSize = 8;
    const noteStartY = 213;
    const noteLineH = 28;
    const segments = notesText.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
    const allLines: string[] = [];

    for (const seg of segments) {
      const wrapped = wrapText(seg, font, noteFontSize, noteBoxMaxW, 2);
      allLines.push(...wrapped);
      if (allLines.length >= 2) break;
    }

    allLines.slice(0, 2).forEach((line, i) => {
      page.drawText(line, {
        x: noteBoxX,
        y: noteStartY - i * noteLineH,
        size: noteFontSize,
        font,
        color: black,
      });
    });
  }

  const qrSize = 65;
  const qrX = (W - qrSize) / 2;
  const qrY = 45;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  const formattedTracking = trackingNumber.match(/.{1,4}/g)?.join(" ") ?? trackingNumber;
  const trackingTextWidth = font.widthOfTextAtSize(formattedTracking, 8);
  page.drawText(formattedTracking, {
    x: (W - trackingTextWidth) / 2,
    y: qrY - 9,
    size: 8,
    font: fontBold,
    color: black,
  });

  page.drawText(approvalDate, { x: 107, y: 17, size: 6.2, font: fontBold, color: black });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
