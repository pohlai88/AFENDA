import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  fetchChatterMessages,
  fetchCommDocument,
  fetchCommDocumentBreadcrumb,
  fetchCommDocumentChildren,
  fetchLabels,
  fetchSubscriptions,
  type CommDocumentRow,
} from "@/lib/api-client";
import DocumentDetailClient from "./DocumentDetailClient";

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const currentPrincipalId = session?.user?.id ?? null;

  let documentRes;
  try {
    documentRes = await fetchCommDocument(id);
  } catch {
    notFound();
  }

  const document = documentRes.data;
  const [chatterMessages, labels, allLabels, subscriptions, childrenRes, breadcrumbRes] =
    await Promise.all([
      fetchChatterMessages({ entityType: "document", entityId: id })
        .then((res) => res.data)
        .catch(() => []),
      fetchLabels({ entityType: "document", entityId: id })
        .then((res) => res.data)
        .catch(() => []),
      fetchLabels()
        .then((res) => res.data)
        .catch(() => []),
      fetchSubscriptions({ entityType: "document", entityId: id })
        .then((res) => res.data)
        .catch(() => []),
      fetchCommDocumentChildren(id)
        .then((res) => res.data)
        .catch(() => ({ data: [] as CommDocumentRow[] })),
      fetchCommDocumentBreadcrumb(id)
        .then((res) => res.data)
        .catch(() => ({ data: [] as CommDocumentRow[] })),
    ]);

  const children = childrenRes?.data ?? [];
  const breadcrumb = breadcrumbRes?.data ?? [];

  return (
    <DocumentDetailClient
      document={document}
      chatterMessages={chatterMessages}
      labels={labels}
      allLabels={allLabels}
      subscriptions={subscriptions}
      children={children}
      breadcrumb={breadcrumb}
      currentPrincipalId={currentPrincipalId}
    />
  );
}
