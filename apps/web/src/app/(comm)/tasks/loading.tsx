import { Skeleton } from "@afenda/ui";

export default function TasksLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {["Number", "Title", "Status", "Priority", "Due Date", "Created"].map((col) => (
                <th key={col} className="px-4 py-2 text-left font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-6 w-16" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-16" />
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
