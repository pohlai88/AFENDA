## Architecture Comparison

| Dimension | Legacy AP (Hexagonal) | Current AFENDA (Schema-is-Truth) |
|-----------|----------------------|----------------------------------|
| **Structure** | Single slice: `slices/ap/` with 7 folders | Split across 5 packages by layer |
| **Entities** | `entities/` → readonly interfaces | `contracts/` → Zod schemas |
| **Repositories** | `ports/` interfaces + `repos/` implementations (40+ files) | Direct Drizzle tables + DbClient |
| **Services** | 60+ files with ApDeps injection | Services per entity in `core/` |
| **Calculators** | Dedicated `calculators/` folder (13+ pure functions) | Inlined in services or `shared/` |
| **Routes** | 12 route files (44+ endpoints) | 1 route file per entity |
| **Error Codes** | Module-local `ap-error-codes.ts` | Centralized `contracts/shared/errors.ts` |
| **Audit** | `TamperResistantOutboxWriter` | `withAudit()` wrapper |

### Key Trade-offs

| Legacy (Hexagonal) | Current (Schema-is-Truth) |
|-------------------|--------------------------|
| ✅ Explicit port interfaces for testability | ✅ Less boilerplate, faster development |
| ✅ 85 enterprise capabilities | ⚠️ 7 capabilities implemented |
| ⚠️ 40+ repo files to maintain | ✅ Direct Drizzle queries |
| ✅ Pure calculators isolated | ⚠️ Calculators scattered |

---

## Full Implementation Plan

### Current Status
**Implemented:** Invoice entity, service, queries, routes (basic lifecycle: submit → approve → post → pay)

**Gap:** 78 of 85 legacy capabilities not yet ported

### Phase 1: Foundation (Sprint 3-4)
```bash
node tools/scaffold.mjs erp/finance/ap payment-terms   # Early discount calc
node tools/scaffold.mjs erp/finance/ap hold            # Approval blocks
node tools/scaffold.mjs erp/finance/ap invoice-line    # Line detail
```

### Phase 2: Supplier Expansion (Sprint 4-5)
- Expand existing Supplier with Sites + Bank Accounts
- Add SupplierWhtProfile for tax config

### Phase 3: Payment Processing (Sprint 5-6)
```bash
node tools/scaffold.mjs erp/finance/ap payment-run     # Batch payments
```
- Payment run lifecycle (DRAFT → APPROVED → EXECUTED)
- Early discount calculator
- Payment file generation (ISO 20022)

### Phase 4: Advanced Features (Sprint 6-7)
```bash
node tools/scaffold.mjs erp/finance/ap prepayment      # Advance payments
node tools/scaffold.mjs erp/finance/ap match-tolerance # Variance rules
node tools/scaffold.mjs erp/finance/ap wht-certificate # Withholding tax
```

### Phase 5: Automation (Sprint 7-8)
- Duplicate detection (fingerprint-based auto-hold)
- Aging report calculator + service
- OCR integration (optional)

### Phase 6: Supplier Portal (Sprint 8-9, optional)
- 30+ self-service endpoints for suppliers

---

## Scaffold Priority Order

| # | Entity | Why |
|---|--------|-----|
| 1 | **Payment Terms** | Early discount calculation |
| 2 | **AP Hold** | Approval workflow blocks |
| 3 | **Invoice Line** | Detailed invoice breakdown |
| 4 | **Payment Run** | Core payment processing |
| 5 | **Prepayment** | Advance payment handling |
| 6 | **WHT Certificate** | Regional tax compliance |
| 7 | **Match Tolerance** | 3-way match support |

Full plan saved to session memory. Ready to start scaffolding Phase 1?
