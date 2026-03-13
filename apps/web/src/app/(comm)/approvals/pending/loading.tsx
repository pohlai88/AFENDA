import { Skeleton } from "@afenda/ui";

export default function PendingApprovalsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-52" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {["Number", "Title", "Urgency", "Status", "Step", "Due", "Requested"].map((col) => (
                <th key={col} className="px-4 py-2 text-left font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <tr key={i} className="border-b">
                {[24, 48, 16, 20, 12, 24, 20].map((w, j) => (
                  <td key={j} className="px-4 py-2">
                    <Skeleton className={`h-4 w-${w}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
