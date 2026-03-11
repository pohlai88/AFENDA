/**
 * NACHA ACH Payment File Generator
 *
 * Generates NACHA ACH (Automated Clearing House) files for US domestic
 * EFT (Electronic Funds Transfer) payments.
 *
 * Format: Fixed-width ASCII (94 characters per line)
 * Standard: 2013 NACHA Operating Rules
 */

export interface NACHAOriginatorInfo {
  readonly immediateDest: string; // 9-digit routing number (bank receiving file)
  readonly immediateOrigin: string; // 10-digit company ID (originating company)
  readonly companyName: string; // 16 chars max
  readonly companyId: string; // 10-digit tax ID
  readonly companyEntryDescription: string; // "PAYROLL", "SUPPLIER", etc. (10 chars max)
  readonly discretionaryData?: string; // Optional (20 chars max)
}

export interface NACHAPaymentItem {
  readonly invoiceNumber: string;
  readonly supplierName: string;
  readonly supplierAccountNumber: string; // Bank account number
  readonly supplierRoutingNumber: string; // 9-digit ABA routing number
  readonly amountMinor: bigint; // Amount in cents
  readonly accountType: "checking" | "savings";
  readonly individualId?: string; // Optional supplier ID (15 chars max)
}

export interface NACHAPaymentFile {
  readonly format: "NACHA_ACH";
  readonly fileName: string;
  readonly content: string; // Fixed-width ASCII
  readonly totalAmountMinor: bigint;
  readonly transactionCount: number;
  readonly generatedAt: Date;
}

/**
 * Pad string to exact length (right-padded with spaces)
 */
function pad(str: string, length: number): string {
  return str.slice(0, length).padEnd(length, " ");
}

/**
 * Left-pad number with zeros
 */
function zeroPad(num: number | bigint | string, length: number): string {
  return String(num).padStart(length, "0");
}

/**
 * Format date as YYMMDD
 */
function formatDate(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = zeroPad(date.getMonth() + 1, 2);
  const dd = zeroPad(date.getDate(), 2);
  return `${yy}${mm}${dd}`;
}

/**
 * Format time as HHMM
 */
function formatTime(date: Date): string {
  const hh = zeroPad(date.getHours(), 2);
  const mm = zeroPad(date.getMinutes(), 2);
  return `${hh}${mm}`;
}

/**
 * Calculate file hash (simple sum of record type codes, mod 10)
 */
function calculateFileHash(recordCount: number): string {
  // Simplified: In production, use actual hash of all record types
  return zeroPad(recordCount % 10, 1);
}

/**
 * Generate NACHA ACH payment file for payment run.
 */
export function generateNACHAFile(
  items: readonly NACHAPaymentItem[],
  originatorInfo: NACHAOriginatorInfo,
  effectiveDate: Date
): NACHAPaymentFile {
  const lines: string[] = [];
  let totalDebitMinor = 0n;
  let entryHash = 0n;
  
  // Record counts
  let batchCount = 1; // Single batch design
  let blockCount = 0; // Calculated at end
  
  // Current date/time for file creation
  const fileDate = new Date();
  const fileDateStr = formatDate(fileDate);
  const fileTimeStr = formatTime(fileDate);
  const effectiveDateStr = formatDate(effectiveDate);
  
  // ── 1. File Header Record (Type 1) ────────────────────────────────────────
  let line = "";
  line += "1"; // Record Type Code
  line += "01"; // Priority Code (always 01)
  line += " " + pad(originatorInfo.immediateDest, 9); // Immediate Destination (routing)
  line += pad(originatorInfo.immediateOrigin, 10); // Immediate Origin (company ID)
  line += fileDateStr; // File Creation Date (YYMMDD)
  line += fileTimeStr; // File Creation Time (HHMM)
  line += "A"; // File ID Modifier (A-Z, starts at A)
  line += "094"; // Record Size (always 094)
  line += "10"; // Blocking Factor (always 10)
  line += "1"; // Format Code (always 1)
  line += pad(originatorInfo.companyName, 23); // Immediate Destination Name
  line += pad(originatorInfo.companyName, 23); // Immediate Origin Name
  line += pad("", 8); // Reference Code (optional)
  
  if (line.length !== 94) {
    throw new Error(`File header must be exactly 94 characters (got ${line.length})`);
  }
  lines.push(line);
  
  // ── 5. Batch Header Record (Type 5) ───────────────────────────────────────
  line = "";
  line += "5"; // Record Type Code
  line += "200"; // Service Class Code (200 = ACH Entries Mixed Debits and Credits, 220 = Credits Only)
  line += pad(originatorInfo.companyName, 16); // Company Name
  line += pad(originatorInfo.discretionaryData ?? "", 20); // Company Discretionary Data
  line += pad(originatorInfo.companyId, 10); // Company Identification
  line += "PPD"; // Standard Entry Class Code (PPD = Prearranged Payment and Deposit)
  line += pad(originatorInfo.companyEntryDescription, 10); // Company Entry Description
  line += pad("", 6); // Company Descriptive Date (optional)
  line += effectiveDateStr; // Effective Entry Date (YYMMDD)
  line += "   "; // Settlement Date (Julian, calculated by ACH operator)
  line += "1"; // Originator Status Code (1 = originator)
  line += pad(originatorInfo.immediateDest.slice(0, 8), 8); // Originating DFI Identification (first 8 digits of routing)
  line += zeroPad(1, 7); // Batch Number
  
  if (line.length !== 94) {
    throw new Error(`Batch header must be exactly 94 characters (got ${line.length})`);
  }
  lines.push(line);
  
  // ── 6. Entry Detail Records (Type 6) ──────────────────────────────────────
  let traceNumber = 1;
  
  for (const item of items) {
    line = "";
    line += "6"; // Record Type Code
    line += item.accountType === "savings" ? "32" : "22"; // Transaction Code (22 = Automated Deposit (checking), 32 = savings)
    line += pad(item.supplierRoutingNumber.slice(0, 8), 8); // Receiving DFI Routing Number (positions 4-11, 8 digits)
    line += item.supplierRoutingNumber.length >= 9 ? item.supplierRoutingNumber[8]! : "0"; // Check Digit (position 12)
    line += pad(item.supplierAccountNumber, 17); // DFI Account Number
    line += zeroPad(item.amountMinor.toString(), 10); // Amount (10 digits, in cents)
    line += pad(item.individualId ?? item.invoiceNumber, 15); // Individual Identification Number
    line += pad(item.supplierName, 22); // Individual Name
    line += "  "; // Discretionary Data
    line += "0"; // Addenda Record Indicator (0 = no addenda)
    line += originatorInfo.immediateDest.slice(0, 8); // Trace Number: 8-digit ODFI routing (positions 80-87)
    line += zeroPad(traceNumber, 7); // Trace Sequence Number (positions 88-94)
    
    if (line.length !== 94) {
      throw new Error(`Entry detail must be exactly 94 characters (got ${line.length})`);
    }
    lines.push(line);
    
    totalDebitMinor += item.amountMinor;
    entryHash += BigInt(item.supplierRoutingNumber.slice(0, 8));
    traceNumber++;
  }
  
  // ── 8. Batch Control Record (Type 8) ──────────────────────────────────────
  line = "";
  line += "8"; // Record Type Code
  line += "200"; // Service Class Code (must match batch header)
  line += zeroPad(items.length, 6); // Entry/Addenda Count
  line += zeroPad(entryHash.toString().slice(-10), 10); // Entry Hash (last 10 digits)
  line += zeroPad(totalDebitMinor.toString(), 12); // Total Debit Entry Dollar Amount
  line += zeroPad("0", 12); // Total Credit Entry Dollar Amount (we only have debits)
  line += pad(originatorInfo.companyId, 10); // Company Identification
  line += pad("", 19); // Message Authentication Code (optional)
  line += pad("", 6); // Reserved
  line += pad(originatorInfo.immediateDest.slice(0, 8), 8); // Originating DFI Identification
  line += zeroPad(1, 7); // Batch Number
  
  if (line.length !== 94) {
    throw new Error(`Batch control must be exactly 94 characters (got ${line.length})`);
  }
  lines.push(line);
  
  // ── 9. File Control Record (Type 9) ───────────────────────────────────────
  blockCount = Math.ceil(lines.length / 10); // Each block = 10 records
  const totalLines = blockCount * 10;
  
  line = "";
  line += "9"; // Record Type Code
  line += zeroPad(batchCount, 6); // Batch Count
  line += zeroPad(blockCount, 6); // Block Count
  line += zeroPad(items.length, 8); // Entry/Addenda Count
  line += zeroPad(entryHash.toString().slice(-10), 10); // Entry Hash
  line += zeroPad(totalDebitMinor.toString(), 12); // Total Debit Entry Dollar Amount
  line += zeroPad("0", 12); // Total Credit Entry Dollar Amount
  line += pad("", 39); // Reserved
  
  if (line.length !== 94) {
    throw new Error(`File control must be exactly 94 characters (got ${line.length})`);
  }
  lines.push(line);
  
  // ── Padding (9999...) to fill last block ──────────────────────────────────
  while (lines.length < totalLines) {
    lines.push("9".repeat(94));
  }
  
  const content = lines.join("\n");
  const fileName = `ACH_${originatorInfo.companyId}_${effectiveDateStr}.txt`;
  
  return {
    format: "NACHA_ACH",
    fileName,
    content,
    totalAmountMinor: totalDebitMinor,
    transactionCount: items.length,
    generatedAt: fileDate,
  };
}
