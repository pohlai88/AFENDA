/**
 * ISO 20022 pain.001.001.03 Payment File Generator
 *
 * Generates Customer Credit Transfer Initiation (pain.001) XML files
 * for SEPA, SWIFT, and international bank transfers.
 *
 * Standard: ISO 20022 pain.001.001.03
 * Use Case: Bulk payment instructions to banks
 */

export interface PaymentRunForExport {
  readonly id: string;
  readonly runNumber: string;
  readonly runDate: Date;
  readonly currencyCode: string;
  readonly items: readonly PaymentRunItemForExport[];
}

export interface PaymentRunItemForExport {
  readonly id: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly supplierName: string;
  readonly supplierIBAN: string;
  readonly supplierBIC?: string;
  readonly amountMinor: bigint;
  readonly currencyCode: string;
  readonly remittanceInfo?: string; // Invoice reference for remittance advice
}

export interface DebtorAccount {
  readonly name: string; // Account holder name
  readonly iban: string;
  readonly bic?: string;
  readonly currency: string;
}

export interface ISO20022PaymentFile {
  readonly format: "ISO20022_PAIN_001";
  readonly fileName: string;
  readonly content: string; // XML string
  readonly totalAmountMinor: bigint;
  readonly transactionCount: number;
  readonly generatedAt: Date;
}

/**
 * Convert minor units (cents) to decimal string (e.g., 12345 → "123.45")
 */
function minorToDecimal(amountMinor: bigint, decimalPlaces: number = 2): string {
  const divisor = BigInt(10 ** decimalPlaces);
  const wholePart = amountMinor / divisor;
  const fractionalPart = amountMinor % divisor;
  
  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimalPlaces, "0");
  
  return `${wholePart}.${fractionalStr}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Format datetime as ISO 8601
 */
function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Generate unique message ID (max 35 chars)
 */
function generateMessageId(runNumber: string, date: Date): string {
  const dateStr = formatDate(date).replace(/-/g, "");
  return `PMT-${dateStr}-${runNumber}`.slice(0, 35);
}

/**
 * Generate ISO 20022 pain.001.001.03 XML for payment run.
 */
export function generateISO20022PaymentFile(
  paymentRun: PaymentRunForExport,
  debtorAccount: DebtorAccount
): ISO20022PaymentFile {
  const { runNumber, runDate, currencyCode, items } = paymentRun;
  
  // Calculate totals
  let totalAmountMinor = 0n;
  for (const item of items) {
    totalAmountMinor += item.amountMinor;
  }
  
  const transactionCount = items.length;
  const messageId = generateMessageId(runNumber, runDate);
  const creationDateTime = formatDateTime(new Date());
  const requestedExecutionDate = formatDate(runDate);
  const controlSum = minorToDecimal(totalAmountMinor);
  
  // Build XML (no external dependencies, pure string concatenation)
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n';
  xml += '  <CstmrCdtTrfInitn>\n';
  
  // Group Header
  xml += '    <GrpHdr>\n';
  xml += `      <MsgId>${escapeXml(messageId)}</MsgId>\n`;
  xml += `      <CreDtTm>${creationDateTime}</CreDtTm>\n`;
  xml += `      <NbOfTxs>${transactionCount}</NbOfTxs>\n`;
  xml += `      <CtrlSum>${controlSum}</CtrlSum>\n`;
  xml += '      <InitgPty>\n';
  xml += `        <Nm>${escapeXml(debtorAccount.name)}</Nm>\n`;
  xml += '      </InitgPty>\n';
  xml += '    </GrpHdr>\n';
  
  // Payment Information (one per payment run)
  xml += '    <PmtInf>\n';
  xml += `      <PmtInfId>${escapeXml(messageId)}</PmtInfId>\n`;
  xml += '      <PmtMtd>TRF</PmtMtd>\n'; // Transfer
  xml += `      <BtchBookg>true</BtchBookg>\n`; // Batch booking
  xml += `      <NbOfTxs>${transactionCount}</NbOfTxs>\n`;
  xml += `      <CtrlSum>${controlSum}</CtrlSum>\n`;
  xml += '      <PmtTpInf>\n';
  xml += '        <SvcLvl>\n';
  xml += '          <Cd>SEPA</Cd>\n'; // Service level: SEPA
  xml += '        </SvcLvl>\n';
  xml += '      </PmtTpInf>\n';
  xml += `      <ReqdExctnDt>${requestedExecutionDate}</ReqdExctnDt>\n`;
  
  // Debtor (payer)
  xml += '      <Dbtr>\n';
  xml += `        <Nm>${escapeXml(debtorAccount.name)}</Nm>\n`;
  xml += '      </Dbtr>\n';
  xml += '      <DbtrAcct>\n';
  xml += '        <Id>\n';
  xml += `          <IBAN>${debtorAccount.iban}</IBAN>\n`;
  xml += '        </Id>\n';
  xml += `        <Ccy>${escapeXml(debtorAccount.currency)}</Ccy>\n`;
  xml += '      </DbtrAcct>\n';
  
  // Debtor Agent (debtor bank)
  if (debtorAccount.bic) {
    xml += '      <DbtrAgt>\n';
    xml += '        <FinInstnId>\n';
    xml += `          <BIC>${debtorAccount.bic}</BIC>\n`;
    xml += '        </FinInstnId>\n';
    xml += '      </DbtrAgt>\n';
  }
  
  xml += '      <ChrgBr>SLEV</ChrgBr>\n'; // Charge bearer: Shared charges
  
  // Credit Transfer Transactions (one per invoice)
  for (const item of items) {
    const instructionId = `INV-${item.invoiceNumber}`.slice(0, 35);
    const endToEndId = `E2E-${item.invoiceId}`.slice(0, 35);
    const amount = minorToDecimal(item.amountMinor);
    
    xml += '      <CdtTrfTxInf>\n';
    xml += '        <PmtId>\n';
    xml += `          <InstrId>${escapeXml(instructionId)}</InstrId>\n`;
    xml += `          <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>\n`;
    xml += '        </PmtId>\n';
    xml += '        <Amt>\n';
    xml += `          <InstdAmt Ccy="${escapeXml(item.currencyCode)}">${amount}</InstdAmt>\n`;
    xml += '        </Amt>\n';
    
    // Creditor Agent (supplier bank)
    if (item.supplierBIC) {
      xml += '        <CdtrAgt>\n';
      xml += '          <FinInstnId>\n';
      xml += `            <BIC>${escapeXml(item.supplierBIC)}</BIC>\n`;
      xml += '          </FinInstnId>\n';
      xml += '        </CdtrAgt>\n';
    }
    
    // Creditor (supplier)
    xml += '        <Cdtr>\n';
    xml += `          <Nm>${escapeXml(item.supplierName)}</Nm>\n`;
    xml += '        </Cdtr>\n';
    xml += '        <CdtrAcct>\n';
    xml += '          <Id>\n';
    xml += `            <IBAN>${escapeXml(item.supplierIBAN)}</IBAN>\n`;
    xml += '          </Id>\n';
    xml += '        </CdtrAcct>\n';
    
    // Remittance Information
    if (item.remittanceInfo) {
      xml += '        <RmtInf>\n';
      xml += `          <Ustrd>${escapeXml(item.remittanceInfo)}</Ustrd>\n`;
      xml += '        </RmtInf>\n';
    }
    
    xml += '      </CdtTrfTxInf>\n';
  }
  
  xml += '    </PmtInf>\n';
  xml += '  </CstmrCdtTrfInitn>\n';
  xml += '</Document>';
  
  const fileName = `PAYMENT_${runNumber}_${formatDate(runDate).replace(/-/g, "")}.xml`;
  
  return {
    format: "ISO20022_PAIN_001",
    fileName,
    content: xml,
    totalAmountMinor,
    transactionCount,
    generatedAt: new Date(),
  };
}
