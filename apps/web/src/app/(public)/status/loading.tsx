import { Spinner } from "@afenda/ui";

export default function StatusLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Spinner className="mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Loading system status...
        </p>
      </div>
    </div>
  );
}