export function varianceMinor(forecastMinor: string, actualMinor: string): string {
  return (BigInt(actualMinor) - BigInt(forecastMinor)).toString();
}
