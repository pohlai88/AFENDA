import { Skeleton } from "@afenda/ui";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {["Number", "Title", "Urgency", "Status", "Step", "Due Date", "Requested"].map(
                (col) => (
                  <th key={col} className="px-4 py-2 text-left font-medium">
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-48" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-6 w-16" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-6 w-20" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-12" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
