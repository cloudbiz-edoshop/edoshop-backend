/** Parse Google Sheets / Forms response URLs into a public CSV export URL. */
export function buildGoogleSheetCsvExportUrl(sheetUrl: string): string {
  const raw = String(sheetUrl || "").trim();
  if (!raw) {
    throw new Error("Sheet URL is required");
  }

  const idMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch?.[1]) {
    throw new Error("Paste a valid Google Sheets link (from your quiz responses sheet)");
  }

  const spreadsheetId = idMatch[1];
  const gidMatch = raw.match(/[#&]gid=(\d+)/);
  const gid = gidMatch?.[1] ?? "0";

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((value) => String(value).trim()));
}

const normalizeHeader = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const PHONE_HEADERS = [
  "phone",
  "phone number",
  "whatsapp",
  "whatsapp number",
  "mobile",
  "telephone",
  "tel",
  "numero",
  "numéro",
];

const NAME_HEADERS = [
  "full name",
  "name",
  "nom",
  "nom complet",
  "winner name",
];

const SCORE_HEADERS = ["score", "points", "quiz score", "note"];

export type QuizSheetColumnMap = {
  phoneIndex: number;
  nameIndex: number;
  scoreIndex: number | null;
};

export function detectQuizSheetColumns(headerRow: string[]): QuizSheetColumnMap {
  const normalized = headerRow.map(normalizeHeader);

  const phoneIndex = normalized.findIndex((header) =>
    PHONE_HEADERS.some((candidate) => header.includes(candidate)),
  );
  const nameIndex = normalized.findIndex((header) =>
    NAME_HEADERS.some((candidate) => header === candidate || header.includes(candidate)),
  );
  const scoreIndex = normalized.findIndex((header) =>
    SCORE_HEADERS.some((candidate) => header.includes(candidate)),
  );

  if (phoneIndex < 0) {
    throw new Error(
      "Could not find a phone/WhatsApp column. Rename a column to “Phone” or “WhatsApp number”.",
    );
  }
  if (nameIndex < 0) {
    throw new Error(
      "Could not find a full name column. Rename a column to “Full name”.",
    );
  }

  return {
    phoneIndex,
    nameIndex,
    scoreIndex: scoreIndex >= 0 ? scoreIndex : null,
  };
}
