---
name: pg-sqill
description: PostgreSQL database helper. Use when writing SQL queries, exploring schema, or working with the database.
allowed-tools: Bash, Read
---

## Database

To query: `.agents/skills/pg-sqill/scripts/query.sh "SELECT * FROM table LIMIT 5"`

Note: Uppercase table names need quotes (e.g., `"User"`, `"Chat"`).

### Schema

```sql
CREATE TABLE public.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    correlation_id text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    details jsonb
);

CREATE TABLE public.dead_letter_job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    task_name text NOT NULL,
    payload jsonb NOT NULL,
    last_error text,
    attempts bigint NOT NULL,
    failed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.document (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    object_key text NOT NULL,
    sha256 text NOT NULL,
    mime text NOT NULL,
    size_bytes bigint NOT NULL,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    document_id uuid NOT NULL,
    label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.iam_membership (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.iam_permission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.iam_principal (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid,
    kind text NOT NULL,
    email text,
    password_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT iam_principal_kind_check CHECK ((kind = ANY (ARRAY['user'::text, 'service'::text])))
);

CREATE TABLE public.iam_role (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.iam_role_permission (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);

CREATE TABLE public.iam_user (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    password_hash text
);

CREATE TABLE public.iam_user_role (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);

CREATE TABLE public.idempotency (
    tenant_id uuid NOT NULL,
    command text NOT NULL,
    key text NOT NULL,
    request_hash text NOT NULL,
    result_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.invoice (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    invoice_number text NOT NULL,
    amount_minor bigint NOT NULL,
    currency_code text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    due_date timestamp with time zone,
    submitted_by uuid,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    po_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.invoice_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    actor_user_id uuid,
    correlation_id text NOT NULL,
    reason text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journal_entry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entry_number text NOT NULL,
    posted_at timestamp with time zone DEFAULT now() NOT NULL,
    memo text,
    posted_by uuid,
    correlation_id text NOT NULL,
    source_invoice_id uuid,
    reversal_of uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journal_line (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit_minor bigint DEFAULT 0 NOT NULL,
    credit_minor bigint DEFAULT 0 NOT NULL,
    currency_code text NOT NULL,
    memo text
);

CREATE TABLE public.membership (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    principal_id uuid NOT NULL,
    party_role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.organization (
    id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    functional_currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.outbox_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    type text NOT NULL,
    version text DEFAULT '1'::text NOT NULL,
    correlation_id text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    payload jsonb NOT NULL,
    delivered boolean DEFAULT false NOT NULL,
    delivered_at timestamp with time zone
);

CREATE TABLE public.party (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    CONSTRAINT party_kind_check CHECK ((kind = ANY (ARRAY['person'::text, 'organization'::text])))
);

CREATE TABLE public.party_role (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    party_id uuid NOT NULL,
    role_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.person (
    id uuid NOT NULL,
    email text,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sequence (
    tenant_id uuid NOT NULL,
    entity_type text NOT NULL,
    prefix text NOT NULL,
    next_value bigint DEFAULT 1 NOT NULL
);

CREATE TABLE public.supplier (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    supplier_tenant_id uuid NOT NULL,
    name text NOT NULL,
    tax_id text,
    contact_email text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    onboarded_by uuid,
    onboarded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'organization'::text NOT NULL,
    functional_currency_code text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

## Tips

- Use `LIMIT 5` when exploring data
- Check column names before writing queries
- Join tables using foreign key relationships shown in schema
- Re-sync after migrations: `bash .agents/skills/pg-sqill/scripts/sync.sh`
