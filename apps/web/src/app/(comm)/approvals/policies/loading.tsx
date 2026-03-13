import { Skeleton } from "@afenda/ui";

export default function ApprovalPoliciesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-52" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="rounded-lg border p-6">
        <Skeleton className="mb-4 h-6 w-44" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full sm:col-span-2" />
          <Skeleton className="h-10 w-full sm:col-span-2" />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Entity Type</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-6 w-16" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
