import { pgEnum, pgTable, uuid, text, integer, unique, index } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../kernel/identity";
import {
  CommDocumentStatusValues,
  CommDocumentTypeValues,
  CommDocumentVisibilityValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const commDocumentStatusEnum = pgEnum("comm_document_status", CommDocumentStatusValues);
export const commDocumentTypeEnum = pgEnum("comm_document_type", CommDocumentTypeValues);
export const commDocumentVisibilityEnum = pgEnum(
  "comm_document_visibility",
  CommDocumentVisibilityValues,
);

export const commDocument = pgTable(
  "comm_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    documentNumber: text("document_number").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: commDocumentStatusEnum("status").notNull().default("draft"),
    documentType: commDocumentTypeEnum("document_type").notNull().default("page"),
    visibility: commDocumentVisibilityEnum("visibility").notNull().default("org"),
    slug: text("slug"),
    parentDocId: uuid("parent_doc_id").references((): any => commDocument.id, {
      onDelete: "set null",
    }), // self-reference: resolved at schema build time
    publishedAt: tsz("published_at"),
    publishedByPrincipalId: uuid("published_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    lastEditedByPrincipalId: uuid("last_edited_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_document_org_number_uidx").on(t.orgId, t.documentNumber),
    unique("comm_document_org_slug_uidx").on(t.orgId, t.slug),
    index("comm_document_org_status_idx").on(t.orgId, t.status),
    index("comm_document_org_updated_idx").on(t.orgId, t.updatedAt),
    index("comm_document_parent_idx").on(t.parentDocId),
    rlsOrg,
  ],
);

export const commDocumentVersion = pgTable(
  "comm_document_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => commDocument.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_document_version_org_doc_version_uidx").on(t.orgId, t.documentId, t.versionNumber),
    index("comm_document_version_doc_idx").on(t.documentId),
    rlsOrg,
  ],
);

export const commDocumentCollaborator = pgTable(
  "comm_document_collaborator",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => commDocument.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("editor"),
    addedByPrincipalId: uuid("added_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    addedAt: tsz("added_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_document_collaborator_pkey").on(t.documentId, t.principalId),
    index("comm_document_collaborator_doc_idx").on(t.documentId),
    index("comm_document_collaborator_org_idx").on(t.orgId),
    rlsOrg,
  ],
);
