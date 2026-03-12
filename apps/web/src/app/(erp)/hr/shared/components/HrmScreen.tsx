import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export interface HrmScreenLink {
  label: string;
  href: string;
}

export interface HrmScreenProps {
  title: string;
  description: string;
  emptyMessage?: string;
  links?: HrmScreenLink[];
}

export function HrmScreen({ title, description, emptyMessage, links = [] }: HrmScreenProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? "No records available yet for this view."}
          </p>
          {links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Button key={link.href} variant="outline" size="sm" asChild>
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
