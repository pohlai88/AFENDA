export function isTenantRoutingV2Enabled(): boolean {
  const rawValue = process.env.NEXT_PUBLIC_TENANT_ROUTING_V2;
  if (rawValue === undefined) return true;

  const normalized = rawValue.trim().toLowerCase();
  return !(normalized === "0" || normalized === "false" || normalized === "off");
}
