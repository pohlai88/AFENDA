type CoverageConfig = {
  provider: "v8";
  include: string[];
  exclude: string[];
  reporter: ["text", "html", "lcov"];
  reportOnFailure: true;
  skipFull: true;
  thresholds: {
    lines: number;
    functions: number;
    statements: number;
    branches: number;
  };
};

export const sharedCoverageThresholds = {
  lines: 50,
  functions: 50,
  statements: 50,
  branches: 40,
} as const;

export function buildCoverageConfig(include: string[], exclude: string[] = []): CoverageConfig {
  return {
    provider: "v8",
    include,
    exclude,
    reporter: ["text", "html", "lcov"],
    reportOnFailure: true,
    skipFull: true,
    thresholds: { ...sharedCoverageThresholds },
  };
}
