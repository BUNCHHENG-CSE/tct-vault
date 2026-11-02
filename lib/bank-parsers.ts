import type { TransactionCategory, TransactionType } from "@/types/database";

export interface ParsedBankTransaction {
  externalId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  rawBalance?: number;
}

export interface BankStatementParseResult {
  success: boolean;
  transactions: ParsedBankTransaction[];
  detectedFormat: "ofx" | "qfx" | "csv" | "unknown";
  accountNumber?: string;
  bankName?: string;
  error?: string;
}

/**
 * Generates a deterministic hash string for transaction idempotency.
 */
function createExternalTxId(date: string, amount: number, desc: string, index = 0): string {
  const cleanDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
  const cleanAmount = Math.abs(amount).toFixed(2);
  return `tx-${date}-${cleanAmount}-${cleanDesc}-${index}`;
}

/**
 * Intelligent categorization based on transaction description keywords.
 */
export function guessCategoryFromDescription(description: string): TransactionCategory {
  const d = description.toLowerCase();

  if (d.includes("salary") || d.includes("payroll") || d.includes("direct dep") || d.includes("wages")) {
    return "salary";
  }
  if (d.includes("bakong") || d.includes("khqr") || d.includes("aba") || d.includes("transfer") || d.includes("tfr") || d.includes("wire") || d.includes("xfer")) {
    return "transfer";
  }
  if (d.includes("freelance") || d.includes("upwork") || d.includes("client") || d.includes("invoice") || d.includes("consult")) {
    return "freelance";
  }
  if (d.includes("rent") || d.includes("mortgage") || d.includes("condo") || d.includes("property")) {
    return "housing";
  }
  if (
    d.includes("food") ||
    d.includes("cafe") ||
    d.includes("coffee") ||
    d.includes("brown coffee") ||
    d.includes("starbucks") ||
    d.includes("grab") ||
    d.includes("restaurant") ||
    d.includes("mcdonald") ||
    d.includes("market") ||
    d.includes("supermarket") ||
    d.includes("gourmet") ||
    d.includes("aeon") ||
    d.includes("lucky") ||
    d.includes("chip mong")
  ) {
    return "food";
  }
  if (
    d.includes("electric") ||
    d.includes("water") ||
    d.includes("utility") ||
    d.includes("internet") ||
    d.includes("telecom") ||
    d.includes("ais") ||
    d.includes("true") ||
    d.includes("dtac") ||
    d.includes("power")
  ) {
    return "utilities";
  }
  if (
    d.includes("netflix") ||
    d.includes("spotify") ||
    d.includes("cinema") ||
    d.includes("steam") ||
    d.includes("movie") ||
    d.includes("theatre") ||
    d.includes("entertainment")
  ) {
    return "entertainment";
  }
  if (
    d.includes("aws") ||
    d.includes("cloud") ||
    d.includes("github") ||
    d.includes("google") ||
    d.includes("vercel") ||
    d.includes("supabase") ||
    d.includes("openai") ||
    d.includes("software") ||
    d.includes("adobe") ||
    d.includes("apple.com/bill")
  ) {
    return "software";
  }
  if (
    d.includes("shopee") ||
    d.includes("lazada") ||
    d.includes("amazon") ||
    d.includes("mall") ||
    d.includes("central") ||
    d.includes("siam") ||
    d.includes("store") ||
    d.includes("shop")
  ) {
    return "shopping";
  }

  return "general";
}

/**
 * Normalizes different date formats to YYYY-MM-DD.
 */
function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // OFX/QFX style: YYYYMMDD or YYYYMMDDHHMMSS
  const ofxMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch && !trimmed.includes("-") && !trimmed.includes("/")) {
    return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  }

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY (common in TH, UK, VN, SG)
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY (US style)
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Universal OFX / QFX parser for standard bank exports.
 */
export function parseOFXStatement(content: string): BankStatementParseResult {
  try {
    const transactions: ParsedBankTransaction[] = [];
    
    // Look for <STMTTRN> blocks
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = trnRegex.exec(content)) !== null) {
      const block = match[1];

      const trnType = block.match(/<TRNTYPE>(.*?)(?:\r|\n|<)/i)?.[1]?.trim() || "";
      const dtPosted = block.match(/<DTPOSTED>(.*?)(?:\r|\n|<)/i)?.[1]?.trim() || "";
      const trnAmt = block.match(/<TRNAMT>(.*?)(?:\r|\n|<)/i)?.[1]?.trim() || "0";
      const fitId = block.match(/<FITID>(.*?)(?:\r|\n|<)/i)?.[1]?.trim() || "";
      const name = block.match(/<NAME>(.*?)(?:\r|\n|<)/i)?.[1]?.trim() || "";
      const memo = block.match(/<MEMO>(.*?)(?:\r|\n|<)/i)?.[1]?.trim() || "";

      const date = normalizeDate(dtPosted) || new Date().toISOString().split("T")[0];
      const parsedAmount = parseFloat(trnAmt.replace(/,/g, ""));
      const isIncome = parsedAmount > 0;
      const absAmount = Math.abs(parsedAmount);

      const description = (name || memo || "Bank Transaction").replace(/&amp;/g, "&");
      const category = guessCategoryFromDescription(description);
      const externalId = fitId || createExternalTxId(date, absAmount, description, index++);

      transactions.push({
        externalId,
        date,
        description,
        amount: Number(absAmount.toFixed(2)),
        type: isIncome ? "income" : "expense",
        category,
      });
    }

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        detectedFormat: "ofx",
        error: "No valid <STMTTRN> transactions found in OFX file",
      };
    }

    return {
      success: true,
      transactions,
      detectedFormat: "ofx",
    };
  } catch (err) {
    return {
      success: false,
      transactions: [],
      detectedFormat: "ofx",
      error: err instanceof Error ? err.message : "Failed to parse OFX/QFX statement",
    };
  }
}

/**
 * Universal CSV Parser that handles diverse bank exports (ABA, ACLEDA, Canadia, Wing, DBS, Chase, etc.).
 */
export function parseCSVStatement(content: string): BankStatementParseResult {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const row: string[] = [];
    let insideQuotes = false;
    let cur = "";

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        insideQuotes = !insideQuotes;
      } else if (c === "," && !insideQuotes) {
        row.push(cur.trim().replace(/^"|"$/g, ""));
        cur = "";
      } else {
        cur += c;
      }
    }
    row.push(cur.trim().replace(/^"|"$/g, ""));
    rows.push(row);
  }

  if (rows.length < 2) {
    return {
      success: false,
      transactions: [],
      detectedFormat: "csv",
      error: "CSV file is empty or missing data rows",
    };
  }

  // Find header row (search first 5 rows for Date, Description, Amount / Debit / Credit)
  let headerIndex = -1;
  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;

  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const row = rows[r].map((c) => c.toLowerCase());
    const dIdx = row.findIndex((c) => c.includes("date") || c.includes("วันที่") || c.includes("time"));
    const descIdx = row.findIndex(
      (c) =>
        c.includes("desc") ||
        c.includes("detail") ||
        c.includes("memo") ||
        c.includes("payee") ||
        c.includes("narration") ||
        c.includes("รายการ")
    );
    const amtIdx = row.findIndex((c) => c === "amount" || c.includes("จำนวนเงิน") || c.includes("total"));
    const debIdx = row.findIndex((c) => c.includes("debit") || c.includes("withdrawal") || c.includes("ถอน"));
    const credIdx = row.findIndex((c) => c.includes("credit") || c.includes("deposit") || c.includes("ฝาก"));

    if (dIdx !== -1 && (descIdx !== -1 || amtIdx !== -1 || debIdx !== -1)) {
      headerIndex = r;
      dateCol = dIdx;
      descCol = descIdx;
      amountCol = amtIdx;
      debitCol = debIdx;
      creditCol = credIdx;
      break;
    }
  }

  // Fallbacks if not detected by header name
  if (headerIndex === -1) {
    headerIndex = 0;
    dateCol = 0;
    descCol = 1;
    amountCol = 2;
  }

  const transactions: ParsedBankTransaction[] = [];
  let index = 0;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= Math.max(dateCol, descCol)) continue;

    const rawDate = row[dateCol] || "";
    const date = normalizeDate(rawDate);
    if (!date) continue; // Skip non-date rows

    const desc = (descCol !== -1 ? row[descCol] : "") || "Bank Transaction";

    let amount = 0;
    let isIncome = false;

    if (debitCol !== -1 && creditCol !== -1) {
      const debitRaw = parseFloat((row[debitCol] || "0").replace(/[^0-9.-]/g, ""));
      const creditRaw = parseFloat((row[creditCol] || "0").replace(/[^0-9.-]/g, ""));

      if (!isNaN(creditRaw) && creditRaw > 0) {
        amount = creditRaw;
        isIncome = true;
      } else if (!isNaN(debitRaw) && debitRaw > 0) {
        amount = debitRaw;
        isIncome = false;
      }
    } else if (amountCol !== -1) {
      const parsedAmt = parseFloat((row[amountCol] || "0").replace(/[^0-9.-]/g, ""));
      if (!isNaN(parsedAmt) && parsedAmt !== 0) {
        amount = Math.abs(parsedAmt);
        isIncome = parsedAmt > 0;
      }
    }

    if (amount <= 0) continue;

    const category = guessCategoryFromDescription(desc);
    const externalId = createExternalTxId(date, amount, desc, index++);

    transactions.push({
      externalId,
      date,
      description: desc,
      amount: Number(amount.toFixed(2)),
      type: isIncome ? "income" : "expense",
      category,
    });
  }

  return {
    success: transactions.length > 0,
    transactions,
    detectedFormat: "csv",
    error: transactions.length === 0 ? "Could not extract valid transactions from CSV format" : undefined,
  };
}

/**
 * Master parser that automatically detects file type (OFX/QFX or CSV) and parses it.
 */
export function parseUniversalBankStatement(
  content: string,
  fileName?: string
): BankStatementParseResult {
  const isOfx =
    content.includes("<OFX>") ||
    content.includes("<STMTTRN>") ||
    fileName?.toLowerCase().endsWith(".ofx") ||
    fileName?.toLowerCase().endsWith(".qfx") ||
    fileName?.toLowerCase().endsWith(".qbo");

  if (isOfx) {
    return parseOFXStatement(content);
  }

  return parseCSVStatement(content);
}
