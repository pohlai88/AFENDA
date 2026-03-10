# AP Module Enhancement — Gap Analysis & Implementation Plan

**Analysis Date:** March 10, 2026  
**Analyst:** AI Agent  
**Scope:** Complete missing AP features and supplier portal implementation

---

## Executive Summary

After comprehensive codebase analysis, the AP module has excellent foundational architecture but **5 critical gaps** preventing full enterprise readiness:

### ✅ Already Implemented (Excellent)
- ✅ **3-Way Matching Calculator** — `packages/core/src/erp/finance/ap/calculators/three-way-match.ts` (COMPLETE)
- ✅ **Duplicate Detection** — `packages/core/src/erp/finance/ap/calculators/detect-duplicates.ts` (COMPLETE)
- ✅ **Database Schema** — All 10 AP entities with migrations (invoices, payment runs, payment terms, prepayments, match tolerance, WHT, etc.)
- ✅ **Core Services** — 9 service files with full business logic
- ✅ **API Routes** — 8 route files all registered in API index
- ✅ **Worker Handlers** — All event handlers registered
- ✅ **UI Components** — Payment runs, payment terms, prepayments UI created

### ❌ Missing Critical Features (Must Implement)

| Gap ID | Feature | Severity | Impact | ERP Benchmark |
|--------|---------|----------|--------|---------------|
| **GAP-1** | Aging Report Calculator | 🔴 **High** | Cannot generate AP aging buckets (0-30, 31-60, 61-90, 90+ days overdue) | SAP: FBL1N, Oracle: Payables Aging Report |
| **GAP-2** | Payment File Generation (ISO 20022) | 🔴 **High** | Cannot export payment instructions to banks (pain.001.001.03 XML) | SAP: F110 payment medium workbench, Oracle: Positive Pay File |
| **GAP-3** | Payment File Generation (NACHA ACH) | 🟡 **Medium** | Cannot generate domestic ACH files for US suppliers | NetSuite: ACH Payment File Generation |
| **GAP-4** | OCR Integration | 🟡 **Medium** | Manual invoice data entry (no automated PDF/image extraction) | SAP: Invoice Capture, Oracle: AI Invoice Automation |
| **GAP-5** | Supplier Portal UI | 🔴 **High** | Only placeholder page exists, no self-service invoice submission | SAP Ariba: Supplier Portal, Coupa: Supplier Portal |

---

## Gap Details & Implementation Specifications

### GAP-1: Aging Report Calculator

**Current State:**
- `ap-module-reference.md` mentions "ap-aging.ts" calculator but file doesn't exist
- No aging service in `packages/core/src/erp/finance/ap/`
- No aging route in `apps/api/src/routes/erp/finance/ap/`

**Required Functionality:**
```typescript
// Aging buckets (industry standard)
interface AgingBucket {
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  minDays: number;
  maxDays: number | null;
  totalAmount: bigint;
  invoiceCount: number;
}

interface SupplierAging {
  supplierId: string;
  supplierName: string;
  totalOutstanding: bigint;
  buckets: AgingBucket[];
}

// Pure calculator function
function calculateAging(
  invoices: readonly Invoice[],
  asOfDate: Date
): SupplierAging[];
```

**Implementation Path:**
1. Create `packages/core/src/erp/finance/ap/calculators/aging.ts` (pure function)
2. Create `packages/core/src/erp/finance/ap/aging.service.ts` (orchestrator)
3. Create `apps/api/src/routes/erp/finance/ap/aging-routes.ts` (REST API)
4. Create `apps/web/src/app/(erp)/finance/ap/aging/page.tsx` (UI)

**Benchmark:**
- **SAP FBL1N:** Vendor line items with aging analysis
- **Oracle Payables:** Aging by Due Date report
- **NetSuite:** AP Aging Summary/Detail

---

### GAP-2: ISO 20022 Payment File Generation

**Current State:**
- Payment methods defined in `payment-run.service.ts` (ACH, SEPA, SWIFT)
- No payment file builder exists
- No ISO 20022 XML generation

**Required Functionality:**
```typescript
// ISO 20022 pain.001.001.03 (Customer Credit Transfer Initiation)
interface PaymentFileResult {
  fileName: string;
  content: string; // XML string
  format: "ISO20022_PAIN_001" | "NACHA" | "MT103";
  totalAmount: bigint;
  numberOfTransactions: number;
  generatedAt: Date;
}

function generateISO20022PaymentFile(
  paymentRun: PaymentRun,
  debitAccount: BankAccount
): PaymentFileResult;
```

**Implementation Path:**
1. Create `packages/core/src/erp/finance/ap/calculators/payment-file-iso20022.ts`
2. Add payment file generation to `payment-run.service.ts`
3. Add `/api/v1/payment-runs/{id}/export` endpoint
4. Add download button in payment run UI

**ISO 20022 Structure:**
```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>PMT20260310-001</MsgId>
      <CreDtTm>2026-03-10T10:30:00Z</CreDtTm>
      <NbOfTxs>15</NbOfTxs>
      <CtrlSum>125000.50</CtrlSum>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PAYMENT_RUN_001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <ReqdExctnDt>2026-03-15</ReqdExctnDt>
      <Dbtr>
        <Nm>AFENDA Client Corp</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>GB29NWBK60161331926819</IBAN></Id>
      </DbtrAcct>
      <CdtTrfTxInf>
        <!-- One per invoice -->
        <PmtId><InstrId>INV-2026-001</InstrId></PmtId>
        <Amt><InstdAmt Ccy="USD">5000.00</InstdAmt></Amt>
        <Cdtr><Nm>ACME Supplies Inc</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>...</IBAN></Id></CdtrAcct>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
```

**Benchmark:**
- **SAP F110:** Payment medium workbench with DME (Data Medium Exchange) format
- **Oracle:** Payments XML Publisher templates
- **SWIFT:** pain.001.001.03 standard used globally

---

### GAP-3: NACHA ACH Payment File Generation

**Current State:**
- ACH mentioned as payment method but no file generation

**Required Functionality:**
```typescript
// NACHA ACH file format (fixed-width ASCII)
function generateNACHAFile(
  paymentRun: PaymentRun,
  originatorInfo: NACHAOriginatorInfo
): PaymentFileResult;

interface NACHAOriginatorInfo {
  immediateDest: string;          // 9-digit routing number
  immediateOrigin: string;        // 10-digit company ID
  companyName: string;            // 16 chars max
  discretionaryData: string;      // Optional
  companyIdentification: string;  // 10-digit tax ID
  companyEntryDescription: string; // "PAYROLL", "SUPPLIER", etc.
}
```

**NACHA Format Structure:**
```
1 File Header
5 Batch Header (one per payment run)
6 Detail Records (one per invoice)
7 Addenda (optional, for remittance info)
8 Batch Trailer
9 File Trailer
```

**Implementation Path:**
1. Create `packages/core/src/erp/finance/ap/calculators/payment-file-nacha.ts`
2. Add NACHA option to payment run export endpoint
3. Validate routing numbers via ABA lookup

**Benchmark:**
- **NetSuite:** ACH Payment File customization
- **Intuit QuickBooks:** Direct Deposit ACH files

---

### GAP-4: OCR Integration for Invoice Scanning

**Current State:**
- `ap-module-reference.md` mentions "hybrid-invoice-extract-provider.ts" but file doesn't exist in current location
- No OCR service implementation found

**Required Functionality:**
```typescript
interface OCRExtractionResult {
  success: boolean;
  confidence: number; // 0-100
  extractedFields: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    supplierName?: string;
    totalAmount?: string;
    taxAmount?: string;
    lineItems?: Array<{
      description: string;
      quantity: string;
      unitPrice: string;
      amount: string;
    }>;
  };
  rawText: string;
  processingTimeMs: number;
}

interface IOCRProvider {
  extractInvoiceData(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<OCRExtractionResult>;
}
```

**Implementation Options:**

| Option | Cost | Accuracy | Integration Complexity |
|--------|------|----------|----------------------|
| **Tesseract.js** (OSS) | Free | 70-85% | Low (Docker sidecar) |
| **Google Vision API** | $1.50/1000 | 90-95% | Medium (API key) |
| **AWS Textract** | $1.50/page | 92-97% | Medium (IAM setup) |
| **Azure Form Recognizer** | $50/1000 | 94-98% | Medium (Cognitive Services) |

**Recommended:** Start with Tesseract.js, allow customer to plug in premium OCR later.

**Implementation Path:**
1. Create `packages/core/src/erp/finance/ap/ocr-provider.interface.ts` (port)
2. Create `packages/core/src/erp/finance/ap/ocr-tesseract-adapter.ts` (adapter)
3. Add `/api/v1/invoices/scan` endpoint (file upload → OCR → draft invoice)
4. Add OCR confidence thresholds (>90% auto-approve, <70% manual review)

**Benchmark:**
- **SAP Invoice Capture:** Built-in OCR with machine learning
- **Oracle AI Invoice Automation:** 95%+ accuracy with training
- **Stampli:** Third-party OCR specialist integrated with ERP

---

### GAP-5: Supplier Portal UI for Self-Service

**Current State:**
- Only placeholder page at `apps/web/src/app/portal/supplier/page.tsx`
- Portal architecture docs mention "30+ supplier self-service endpoints" but no UI
- Auth infrastructure complete (portal invitation, JWT claims, middleware guards)

**Required Features:**

#### Feature Matrix (Based on SAP Ariba & Coupa Benchmarks)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Dashboard** | 🔴 High | Invoice status summary, payment status, overdue items |
| **Submit Invoice** | 🔴 High | Upload PDF + manual entry form, OCR extraction |
| **Invoice List** | 🔴 High | View submitted invoices with status badges |
| **Invoice Detail** | 🔴 High | View invoice details, download PDF, see payment status |
| **Payment History** | 🟡 Medium | View payment runs that included supplier's invoices |
| **Prepayment Requests** | 🟡 Medium | Request advance payment against large orders |
| **Document Upload** | 🟡 Medium | Upload supporting documents (W-9, contracts, certificates) |
| **Bank Account Management** | 🟡 Medium | Add/edit bank accounts for payments |
| **Contact Information** | 🟢 Low | Update supplier contact details |
| **Notification Preferences** | 🟢 Low | Email notifications for invoice approval/payment |

**Implementation Path:**

```
apps/web/src/app/portal/supplier/
├── page.tsx                        # Dashboard
├── layout.tsx                      # Supplier portal shell (sidebar)
├── invoices/
│   ├── page.tsx                   # Invoice list
│   ├── new/page.tsx               # Submit new invoice form
│   ├── [id]/page.tsx              # Invoice detail view
│   └── InvoiceListClient.tsx      # Client component with data fetching
├── payments/
│   ├── page.tsx                   # Payment history
│   └── PaymentHistoryClient.tsx
├── documents/
│   ├── page.tsx                   # Document library
│   └── DocumentUploadForm.tsx
├── profile/
│   ├── page.tsx                   # Supplier profile
│   ├── bank-accounts/page.tsx     # Bank account management
│   └── contacts/page.tsx          # Contact management
└── settings/
    └── page.tsx                   # Notification preferences
```

**API Endpoints (from Portal Architecture Docs):**
```
GET    /api/v1/portal/supplier/dashboard
GET    /api/v1/portal/supplier/invoices
POST   /api/v1/portal/supplier/invoices
GET    /api/v1/portal/supplier/invoices/{id}
GET    /api/v1/portal/supplier/payments
POST   /api/v1/portal/supplier/documents/upload
GET    /api/v1/portal/supplier/documents
PATCH  /api/v1/portal/supplier/profile
POST   /api/v1/portal/supplier/bank-accounts
GET    /api/v1/portal/supplier/bank-accounts
```

**Benchmark:**
- **SAP Ariba Supplier Portal:** Invoice submission, PO acknowledgment, catalog management
- **Coupa Supplier Portal:** Invoice reconciliation, payment status tracking
- **NetSuite Vendor Center:** Self-service invoice entry, payment inquiry

---

## Enterprise ERP Benchmark Analysis

### SAP S/4HANA AP Module (Gold Standard)

| Feature | SAP Transaction Code | AFENDA Status |
|---------|---------------------|---------------|
| **Invoice Entry** | FB60 (Direct), MIRO (PO-based) | ✅ Complete |
| **Invoice Approval** | FBRA | ✅ Complete |
| **3-Way Match** | MIRO tolerance check | ✅ Complete |
| **Payment Run** | F110 | ✅ Complete |
| **Payment Medium** | DME (ISO 20022, MT103) | ❌ **Missing (GAP-2)** |
| **Vendor Master** | FK01, FK02 | ✅ Complete |
| **Aging Report** | FBL1N | ❌ **Missing (GAP-1)** |
| **WHT** | WITHHOLDING_TAX | ✅ Complete |
| **Duplicate Check** | FI_DUPLICATE_INVOICE | ✅ Complete |
| **OCR** | SAP Invoice Capture | ❌ **Missing (GAP-4)** |
| **Supplier Portal** | SAP Ariba | ❌ **Missing (GAP-5)** |

**Maturity Score:** 7/11 (64%) — **Good foundation, needs 4 critical enhancements**

### Oracle Fusion Payables (Silver Standard)

| Feature | Oracle Module | AFENDA Status |
|---------|--------------|---------------|
| **Invoice Import** | Payables Open Interface | ✅ Complete |
| **Approval Workflow** | AME (Approval Management) | ✅ Complete |
| **Payment Process** | Payments Dashboard | ✅ Complete |
| **Payment Format** | BI Publisher templates | ❌ **Missing (GAP-2, GAP-3)** |
| **Aging Reports** | Payables Aging | ❌ **Missing (GAP-1)** |
| **Invoice Automation** | AI Invoice Automation | ❌ **Missing (GAP-4)** |

**Maturity Score:** 3/6 (50%)

### NetSuite Accounts Payable (Bronze Standard)

| Feature | NetSuite Feature | AFENDA Status |
|---------|-----------------|---------------|
| **Bill Entry** | Vendor Bill | ✅ Complete |
| **Approval Routing** | Workflow | ✅ Complete |
| **Bill Payment** | Bill Payment | ✅ Complete |
| **ACH File** | ACH Payment File | ❌ **Missing (GAP-3)** |
| **Vendor Portal** | Vendor Center | ❌ **Missing (GAP-5)** |

**Maturity Score:** 3/5 (60%)

---

## Implementation Priority Roadmap

### Phase 1: Critical Gaps (1-2 weeks)

| Task | Effort | Files to Create | Business Value |
|------|--------|-----------------|----------------|
| **GAP-1: Aging Report** | 3 days | 4 files (calculator, service, route, UI) | **High** — C-suite visibility into AP health |
| **GAP-5: Supplier Portal** | 7 days | 12 files (8 pages, 4 clients) | **Critical** — Enable external supplier self-service |

### Phase 2: Payment Automation (1 week)

| Task | Effort | Files to Create | Business Value |
|------|--------|-----------------|----------------|
| **GAP-2: ISO 20022** | 4 days | 3 files (calculator, service update, UI button) | **High** — International payment automation |
| **GAP-3: NACHA ACH** | 3 days | 2 files (calculator, service update) | **Medium** — US domestic payment automation |

### Phase 3: Invoice Automation (1 week)

| Task | Effort | Files to Create | Business Value |
|------|--------|-----------------|----------------|
| **GAP-4: OCR** | 5 days | 5 files (interface, adapter, route, UI, Docker) | **High** — Reduce manual data entry by 80% |

---

## Success Criteria

### Definition of Done (DoD)

For each gap, the following must be completed:

✅ **Code:**
- Pure calculator function with unit tests (>90% coverage)
- Service orchestrator with integration tests
- API route with request/response validation (Zod schemas)
- UI component with loading/error states

✅ **Documentation:**
- JSDoc comments on all exported functions
- API endpoint added to route registry
- OWNERS.md updated with new exports

✅ **Quality Gates:**
- `pnpm typecheck` passes
- `pnpm test` passes (all new tests)
- `pnpm check:all` passes (18 CI gates)
- No ESLint errors
- No shadcn-enforcement violations

✅ **Integration:**
- Feature works end-to-end (UI → API → Service → DB → Response)
- Audit logs written for all mutations
- Correlation IDs propagated correctly
- Error handling with user-friendly messages

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **ISO 20022 Complexity** | 🟡 Medium | Use XML builder library (fast-xml-parser), validate with XSD schema |
| **NACHA Fixed-Width Format** | 🟢 Low | Well-documented format, use padStart/padEnd utilities |
| **OCR Accuracy** | 🟡 Medium | Start with confidence thresholds, allow manual review queue |
| **Supplier Portal Security** | 🔴 High | Leverage existing portal auth infrastructure, RLS policies enforce isolation |
| **Breaking Changes** | 🟢 Low | All additions (no breaking changes to existing services) |

---

## Next Steps

1. **Approve this gap analysis** — Review with stakeholders
2. **Prioritize Phase 1** — Start with Aging Report + Supplier Portal
3. **Kickoff implementation** — Follow schema-is-truth workflow
4. **Iterative delivery** — Release each feature as soon as DoD is met
5. **Continuous testing** — Run CI gates after each feature completion

---

**Prepared by:** AI Agent  
**Document Version:** 1.0  
**Next Review Date:** After Phase 1 completion
