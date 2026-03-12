import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function FxExposureGrid() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>FX Exposures</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        FX exposure management is available via Treasury FX and revaluation services.
      </CardContent>
    </Card>
  );
}
