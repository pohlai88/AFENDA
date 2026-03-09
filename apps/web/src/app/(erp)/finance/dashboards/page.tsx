import {
  AnalyticsWorkspace,
  SectionCards,
  ChartAreaInteractive,
  type ChartConfig,
} from "@afenda/ui";

/** Sample chart data — replace with API fetch. */
const chartData = [
  { date: "2024-04-01", outstanding: 222, due: 150 },
  { date: "2024-04-08", outstanding: 409, due: 320 },
  { date: "2024-04-15", outstanding: 120, due: 170 },
  { date: "2024-04-22", outstanding: 224, due: 170 },
  { date: "2024-04-29", outstanding: 315, due: 240 },
  { date: "2024-05-06", outstanding: 498, due: 520 },
  { date: "2024-05-13", outstanding: 197, due: 160 },
  { date: "2024-05-20", outstanding: 177, due: 230 },
  { date: "2024-05-27", outstanding: 420, due: 460 },
  { date: "2024-06-03", outstanding: 103, due: 160 },
  { date: "2024-06-10", outstanding: 155, due: 200 },
  { date: "2024-06-17", outstanding: 475, due: 520 },
  { date: "2024-06-24", outstanding: 132, due: 180 },
];

const chartConfig = {
  outstanding: { label: "Outstanding", color: "var(--chart-1)" },
  due: { label: "Due", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Finance Dashboards — professional SectionCards + ChartAreaInteractive. */
export default function DashboardsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AnalyticsWorkspace
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: (
              <div className="flex flex-col gap-6">
                <SectionCards
                  cards={[
                    {
                      title: "AP Outstanding",
                      value: "—",
                      trend: "+12.5%",
                      trendPositive: true,
                      description: "Total payables outstanding",
                      footer: "Wire to aging API",
                    },
                    {
                      title: "Invoices Due",
                      value: "—",
                      trend: "-5%",
                      trendPositive: false,
                      description: "Due within 30 days",
                      footer: "Wire to due-date API",
                    },
                    {
                      title: "Active Accounts",
                      value: "—",
                      trend: "+8%",
                      trendPositive: true,
                      description: "Suppliers with open balances",
                      footer: "Wire to supplier API",
                    },
                    {
                      title: "Growth Rate",
                      value: "—",
                      trend: "+4.5%",
                      trendPositive: true,
                      description: "MoM change",
                      footer: "Wire to analytics API",
                    },
                  ]}
                />
                <ChartAreaInteractive
                  title="AP Trends"
                  description="Outstanding vs due over time"
                  data={chartData}
                  dataKeys={["outstanding", "due"]}
                  chartConfig={chartConfig}
                  defaultRange="90d"
                />
              </div>
            ),
          },
          {
            key: "charts",
            label: "Charts",
            content: (
              <ChartAreaInteractive
                title="AP Aging Trend"
                description="Outstanding balance over last 3 months"
                data={chartData}
                dataKeys={["outstanding"]}
                chartConfig={{ outstanding: { label: "Outstanding", color: "var(--chart-1)" } }}
                defaultRange="90d"
              />
            ),
          },
        ]}
      />
    </div>
  );
}
