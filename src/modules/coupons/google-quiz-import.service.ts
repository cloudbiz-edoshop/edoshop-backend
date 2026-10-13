import { normalizeCouponFullName } from "./coupon-name";
import { normalizeCouponPhone } from "./coupon-phone";
import {
  buildGoogleSheetCsvExportUrl,
  detectQuizSheetColumns,
  parseCsvRows,
} from "./google-quiz-sheet";
import type { UserRepository } from "@/modules/users/users.repository";

export type ImportedQuizWinner = {
  userId: number;
  phoneNumber: string;
  fullName: string;
  score?: number | null;
};

export type QuizImportRowIssue = {
  row: number;
  reason: string;
  phone?: string;
  fullName?: string;
};

export class GoogleQuizImportService {
  constructor(private readonly userRepository: UserRepository) {}

  private async findUserByPhone(phoneRaw: string) {
    const trimmed = phoneRaw.trim();
    const digits = normalizeCouponPhone(trimmed);
    const candidates = [trimmed, digits, digits ? `+${digits}` : ""].filter(
      (value, index, list) => value && list.indexOf(value) === index,
    );

    for (const candidate of candidates) {
      const user = await this.userRepository.findByPhoneNumber(candidate);
      if (user) {
        return user;
      }
    }

    return null;
  }

  async fetchCsv(sheetUrl: string): Promise<string> {
    const exportUrl = buildGoogleSheetCsvExportUrl(sheetUrl);
    const response = await fetch(exportUrl, {
      headers: { Accept: "text/csv" },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        "Could not download the sheet. Share it as “Anyone with the link can view” and use the responses spreadsheet URL from Google Forms.",
      );
    }

    return await response.text();
  }

  async importWinnersFromSheet(params: {
    sheetUrl: string;
    minScore?: number | null;
  }): Promise<{
    winners: ImportedQuizWinner[];
    issues: QuizImportRowIssue[];
    detectedColumns: { phone: string; name: string; score?: string };
  }> {
    const csv = await this.fetchCsv(params.sheetUrl);
    const table = parseCsvRows(csv);
    if (table.length < 2) {
      throw new Error("The sheet has no response rows yet.");
    }

    const [headerRow, ...dataRows] = table;
    const columns = detectQuizSheetColumns(headerRow);
    const minScore =
      params.minScore != null && Number.isFinite(params.minScore)
        ? Number(params.minScore)
        : null;

    const winners: ImportedQuizWinner[] = [];
    const issues: QuizImportRowIssue[] = [];
    const seenUserIds = new Set<number>();

    for (let index = 0; index < dataRows.length; index += 1) {
      const rowNumber = index + 2;
      const cells = dataRows[index];
      const phoneRaw = cells[columns.phoneIndex]?.trim();
      const fullName = cells[columns.nameIndex]?.trim();
      const scoreRaw =
        columns.scoreIndex != null ? cells[columns.scoreIndex]?.trim() : "";
      const score =
        scoreRaw && Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : null;

      if (!phoneRaw && !fullName) {
        continue;
      }

      if (!phoneRaw || !fullName) {
        issues.push({
          row: rowNumber,
          reason: "Missing phone or full name",
          phone: phoneRaw,
          fullName,
        });
        continue;
      }

      if (minScore != null && (score == null || score < minScore)) {
        issues.push({
          row: rowNumber,
          reason: `Score below minimum (${minScore})`,
          phone: phoneRaw,
          fullName,
        });
        continue;
      }

      const user = await this.findUserByPhone(phoneRaw);
      if (!user) {
        issues.push({
          row: rowNumber,
          reason: "No Edoshop account for this WhatsApp number",
          phone: phoneRaw,
          fullName,
        });
        continue;
      }

      if (!user.fullName?.trim()) {
        issues.push({
          row: rowNumber,
          reason: "Account has no full name on file",
          phone: phoneRaw,
          fullName,
        });
        continue;
      }

      if (
        normalizeCouponFullName(user.fullName) !==
        normalizeCouponFullName(fullName)
      ) {
        issues.push({
          row: rowNumber,
          reason: "Full name does not match the Edoshop account",
          phone: phoneRaw,
          fullName,
        });
        continue;
      }

      if (seenUserIds.has(user.id)) {
        issues.push({
          row: rowNumber,
          reason: "Duplicate winner in sheet",
          phone: phoneRaw,
          fullName,
        });
        continue;
      }

      seenUserIds.add(user.id);
      winners.push({
        userId: user.id,
        phoneNumber: normalizeCouponPhone(phoneRaw),
        fullName: user.fullName.trim(),
        score,
      });
    }

    return {
      winners,
      issues,
      detectedColumns: {
        phone: headerRow[columns.phoneIndex] || "Phone",
        name: headerRow[columns.nameIndex] || "Full name",
        ...(columns.scoreIndex != null
          ? { score: headerRow[columns.scoreIndex] || "Score" }
          : {}),
      },
    };
  }
}
