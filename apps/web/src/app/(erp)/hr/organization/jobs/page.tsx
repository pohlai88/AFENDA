import { HrmScreen } from "../../shared/components/HrmScreen";

export default function JobCatalogPage() {
  return (
    <HrmScreen
      title="Job Catalog"
      description="Standardized job architecture for organization and compensation alignment."
      emptyMessage="No jobs found. Seed or create jobs to structure position and grade mapping."
      links={[{ label: "Positions", href: "/hr/organization/positions" }]}
    />
  );
}
