import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wrench,
  RefreshCw,
  Info,
} from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@afenda/ui";

export const revalidate = 60; // ISR every 60 seconds

export const metadata: Metadata = {
  title: "System Status — AFENDA",
  description:
    "Real-time system status for AFENDA platform — monitor uptime, performance, and service health.",
  alternates: { canonical: "/status" },
  openGraph: {
    title: "System Status — AFENDA",
    description: "Real-time platform status and uptime monitoring.",
    type: "website",
    url: "/status",
  },
};

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface Service {
  name: string;
  status: ServiceStatus;
  uptime: string;
  responseTime: string;
}

// In production, replace with actual monitoring API
async function getSystemStatus() {
  return {
    overallStatus: "operational" as ServiceStatus,
    services: [
      {
        name: "API Gateway",
        status: "operational" as ServiceStatus,
        uptime: "99.98%",
        responseTime: "45ms",
      },
      {
        name: "Database (NexusCanon)",
        status: "operational" as ServiceStatus,
        uptime: "99.99%",
        responseTime: "12ms",
      },
      {
        name: "Authentication Service",
        status: "operational" as ServiceStatus,
        uptime: "99.97%",
        responseTime: "38ms",
      },
      {
        name: "Workflow Engine",
        status: "operational" as ServiceStatus,
        uptime: "99.95%",
        responseTime: "156ms",
      },
      {
        name: "Module Orchestration",
        status: "operational" as ServiceStatus,
        uptime: "99.96%",
        responseTime: "89ms",
      },
      {
        name: "Audit Logging",
        status: "operational" as ServiceStatus,
        uptime: "99.99%",
        responseTime: "23ms",
      },
    ] satisfies Service[],
    incidents: [
      {
        id: "inc-001",
        title: "Scheduled Maintenance — Database Upgrade",
        status: "resolved",
        description:
          "Planned database upgrade to improve performance and add new features.",
        startTime: "2026-02-01T02:00:00Z",
        endTime: "2026-02-01T04:30:00Z",
      },
    ],
  };
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "operational":
      return (
        <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
      );
    case "degraded":
      return (
        <AlertTriangle
          className="h-5 w-5 text-yellow-600"
          aria-hidden="true"
        />
      );
    case "outage":
      return (
        <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
      );
    case "maintenance":
      return (
        <Wrench className="h-5 w-5 text-blue-600" aria-hidden="true" />
      );
  }
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "operational":
      return <Badge className="bg-green-600">Operational</Badge>;
    case "degraded":
      return <Badge variant="secondary">Degraded Performance</Badge>;
    case "outage":
      return <Badge variant="destructive">Service Outage</Badge>;
    case "maintenance":
      return <Badge variant="outline">Scheduled Maintenance</Badge>;
  }
}

export default async function StatusPage() {
  const status = await getSystemStatus();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-16">
      <div className="w-full space-y-8">
        {/* Simulated Data Disclaimer */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Simulated Data
              </p>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                This status page currently displays simulated service health data. In
                production, this will be replaced with real-time monitoring from Datadog,
                Grafana, or custom health checks. See{" "}
                <Link href="/sla" className="underline hover:text-blue-600">
                  SLA page
                </Link>{" "}
                for our uptime commitments.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <StatusIcon status={status.overallStatus} />
            <h1 className="text-4xl font-bold tracking-tight">
              System Status
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Real-time monitoring of AFENDA platform services
          </p>
          <div className="flex items-center justify-center gap-2">
            <StatusBadge status={status.overallStatus} />
            <Badge variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
              Auto-refreshes every 60s
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Health</CardTitle>
            <CardDescription>
              Current status of all platform services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.services.map((service, idx) => (
                <div key={service.name}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <StatusIcon status={service.status} />
                      <p className="font-semibold text-sm">{service.name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-semibold">{service.uptime}</p>
                        <p className="text-xs text-muted-foreground">
                          Uptime
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {service.responseTime}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Response
                        </p>
                      </div>
                    </div>
                  </div>
                  {idx < status.services.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>
              Past 30 days of incidents and maintenance windows
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle
                  className="h-12 w-12 mx-auto mb-3 text-green-600"
                  aria-hidden="true"
                />
                <p className="font-semibold">No incidents reported</p>
                <p className="text-sm">All systems have been operational</p>
              </div>
            ) : (
              <div className="space-y-4">
                {status.incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-semibold">{incident.title}</h4>
                      <Badge variant="outline" className="shrink-0">
                        {incident.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {incident.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p>
                        Started:{" "}
                        {new Date(incident.startTime).toLocaleDateString(
                          "en-US",
                          {
                            dateStyle: "medium",
                          },
                        )}
                      </p>
                      {incident.endTime && (
                        <p>
                          Resolved:{" "}
                          {new Date(incident.endTime).toLocaleDateString(
                            "en-US",
                            { dateStyle: "medium" },
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uptime Metrics</CardTitle>
            <CardDescription>30-day rolling average</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg border">
                <p className="text-3xl font-bold text-green-600">99.97%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Overall Uptime
                </p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-3xl font-bold text-blue-600">42ms</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Avg Response Time
                </p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-3xl font-bold text-purple-600">0</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Active Incidents
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Link
            href="/sla"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            View SLA Commitments
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
