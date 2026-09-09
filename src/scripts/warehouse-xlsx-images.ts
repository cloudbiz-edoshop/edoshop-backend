import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import * as XLSX from "xlsx";

import {
  WAREHOUSE_SHEETS,
  normalizeLegacyReference,
  normalizeText,
} from "./warehouse-import-utils";

const PHOTO_COLUMN_START = 14;

type ImageAnchor = {
  row: number;
  col: number;
  mediaPath: string;
};

const readZipEntry = (xlsxPath: string, entryPath: string) => {
  try {
    return execFileSync("unzip", ["-p", xlsxPath, entryPath], {
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
};

const readZipText = (xlsxPath: string, entryPath: string) => {
  const buffer = readZipEntry(xlsxPath, entryPath);
  return buffer ? buffer.toString("utf8") : "";
};

const parseRelationships = (xml: string) => {
  const relationships = new Map<string, string>();
  const pattern =
    /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;

  for (const match of xml.matchAll(pattern)) {
    const target = match[2].replace(/^\.\.\//, "xl/");
    relationships.set(match[1], target.startsWith("xl/") ? target : `xl/${target}`);
  }

  return relationships;
};

const parseDrawingAnchors = (drawingXml: string, rels: Map<string, string>) => {
  const anchors: ImageAnchor[] = [];
  const anchorPattern =
    /<xdr:(oneCellAnchor|twoCellAnchor)[\s\S]*?<\/xdr:\1>/g;

  for (const block of drawingXml.match(anchorPattern) || []) {
    const rowMatch = block.match(/<xdr:row>(\d+)<\/xdr:row>/);
    const colMatch = block.match(/<xdr:col>(\d+)<\/xdr:col>/);
    const embedMatch = block.match(/r:embed="([^"]+)"/);

    if (!rowMatch || !colMatch || !embedMatch) continue;

    const mediaPath = rels.get(embedMatch[1]);
    if (!mediaPath) continue;

    anchors.push({
      row: Number.parseInt(rowMatch[1], 10),
      col: Number.parseInt(colMatch[1], 10),
      mediaPath,
    });
  }

  return anchors;
};

const getSheetDrawingPath = (xlsxPath: string, sheetFileName: string) => {
  const relsXml = readZipText(
    xlsxPath,
    `xl/worksheets/_rels/${sheetFileName}.xml.rels`,
  );
  if (!relsXml) return null;

  const rels = parseRelationships(relsXml);
  for (const target of rels.values()) {
    if (target.includes("/drawings/")) {
      return target;
    }
  }

  return null;
};

const resolveSheetFileName = (xlsxPath: string, sheetName: string) => {
  const workbookRelsXml = readZipText(xlsxPath, "xl/_rels/workbook.xml.rels");
  const workbookXml = readZipText(xlsxPath, "xl/workbook.xml");
  if (!workbookRelsXml || !workbookXml) return null;

  const workbookRels = parseRelationships(workbookRelsXml);
  const sheetPattern =
    new RegExp(
      `<sheet[^>]*name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*r:id="([^"]+)"`,
    );
  const sheetMatch = workbookXml.match(sheetPattern);
  if (!sheetMatch) return null;

  const worksheetPath = workbookRels.get(sheetMatch[1]);
  if (!worksheetPath) return null;

  return worksheetPath
    .replace(/^xl\//, "")
    .replace(/^worksheets\//, "")
    .replace(/\.xml$/, "");
};

export const loadWorkbookRowReferencesByIndex = (xlsxPath: string) => {
  const workbook = XLSX.read(readFileSync(xlsxPath), { type: "buffer" });
  const rowReferences = new Map<string, string>();

  for (const sheetConfig of WAREHOUSE_SHEETS) {
    const sheet = workbook.Sheets[sheetConfig.sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: "",
    });

    for (let index = 5; index < rows.length; index += 1) {
      const legacyReference = normalizeLegacyReference(
        normalizeText(rows[index]?.[2]),
      );
      if (!legacyReference) continue;
      rowReferences.set(`${sheetConfig.sheetName}:${index}`, legacyReference);
    }
  }

  return rowReferences;
};

export const loadWorkbookImagesByReference = (xlsxPath: string) => {
  const rowReferences = loadWorkbookRowReferencesByIndex(xlsxPath);
  const imagesByReference = new Map<string, Buffer[]>();

  for (const sheetConfig of WAREHOUSE_SHEETS) {
    const sheetFileName = resolveSheetFileName(xlsxPath, sheetConfig.sheetName);
    if (!sheetFileName) continue;

    const drawingPath = getSheetDrawingPath(xlsxPath, sheetFileName);
    if (!drawingPath) continue;

    const drawingXml = readZipText(xlsxPath, drawingPath);
    const drawingRelsPath = drawingPath.replace(
      "drawings/",
      "drawings/_rels/",
    ).replace(".xml", ".xml.rels");
    const drawingRelsXml = readZipText(xlsxPath, drawingRelsPath);
    if (!drawingXml || !drawingRelsXml) continue;

    const drawingRels = parseRelationships(drawingRelsXml);
    const anchors = parseDrawingAnchors(drawingXml, drawingRels).filter(
      (anchor) => anchor.col >= PHOTO_COLUMN_START,
    );

    const grouped = new Map<number, ImageAnchor[]>();
    for (const anchor of anchors) {
      const current = grouped.get(anchor.row) ?? [];
      current.push(anchor);
      grouped.set(anchor.row, current);
    }

    for (const [row, rowAnchors] of grouped.entries()) {
      const legacyReference = rowReferences.get(`${sheetConfig.sheetName}:${row}`);
      if (!legacyReference) continue;

      const buffers = rowAnchors
        .sort((left, right) => left.col - right.col)
        .map((anchor) => readZipEntry(xlsxPath, anchor.mediaPath))
        .filter((buffer): buffer is Buffer => Boolean(buffer));

      if (!buffers.length) continue;

      const existing = imagesByReference.get(legacyReference) ?? [];
      imagesByReference.set(legacyReference, [...existing, ...buffers]);
    }
  }

  return imagesByReference;
};

export const getImageExtension = (buffer: Buffer) => {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  return "jpg";
};

export const getImageContentType = (extension: string) => {
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};
