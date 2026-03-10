"use client";

import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@afenda/ui";

const TRUST_INDICATORS = [
  "Tenant isolation enabled",
  "MFA required",
  "Immutable audit ledger",
  "RBAC / capability control",
];

export function CompliancePanel() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="trust-compliance" className="border-none">
        <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:no-underline hover:text-foreground transition-colors">
          Trust & compliance
        </AccordionTrigger>
        <AccordionContent>
          <ul className="flex flex-col space-y-2.5 pt-1 pb-2">
            {TRUST_INDICATORS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-xs text-muted-foreground"
              >
                <div className="flex size-4 items-center justify-center rounded-full bg-primary/10">
                  <Check
                    className="size-2.5 shrink-0 text-primary"
                    strokeWidth={3}
                    aria-hidden
                  />
                </div>
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
