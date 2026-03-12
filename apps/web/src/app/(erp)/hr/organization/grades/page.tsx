import { HrmScreen } from "../../shared/components/HrmScreen";

export default function GradeCatalogPage() {
  return (
    <HrmScreen
      title="Grade Catalog"
      description="Grade hierarchy and salary anchors used across recruitment and employment offers."
      emptyMessage="No grade structure found. Seed grades to support offers and employment placement."
      links={[{ label: "Jobs", href: "/hr/organization/jobs" }]}
    />
  );
}
