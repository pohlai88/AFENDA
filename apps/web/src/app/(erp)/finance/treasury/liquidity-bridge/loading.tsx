import { Card, CardContent, CardHeader } from "@afenda/ui";

export default function TreasuryLiquidityBridgeLoading() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <div className="h-7 w-48 bg-muted animate-pulse rounded" />
        <div className="mt-2 h-4 w-96 bg-muted animate-pulse rounded" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="mt-1 h-3 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-36 bg-muted animate-pulse rounded" />
              <div className="mt-2 h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {[0, 1].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-56 bg-muted animate-pulse rounded" />
            <div className="mt-1 h-4 w-80 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} className="h-8 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
