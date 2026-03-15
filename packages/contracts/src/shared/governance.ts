import { PermissionValues } from "../all-permissions.js";

export type SeedPermissionRow = { key: string };

export function verifySeedMatchesCode(
  seedFile: readonly SeedPermissionRow[] | readonly string[],
  permissionValues: readonly string[] = PermissionValues,
): {
  ok: boolean;
  missingInSeed: string[];
  unknownInSeed: string[];
} {
  const seedKeys = new Set(
    seedFile
      .map((row) => (typeof row === "string" ? row : row.key))
      .filter((value) => value.length > 0),
  );
  const canonical = new Set(permissionValues);

  const missingInSeed = Array.from(canonical)
    .filter((value) => !seedKeys.has(value))
    .sort();
  const unknownInSeed = Array.from(seedKeys)
    .filter((value) => !canonical.has(value))
    .sort();

  return {
    ok: missingInSeed.length === 0 && unknownInSeed.length === 0,
    missingInSeed,
    unknownInSeed,
  };
}

function parseSemver(version: string): { major: number; minor: number; patch: number } {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`invalid semver: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function schemaCompatibilityCheck(input: {
  currentVersion: string;
  targetVersion: string;
  allowMajorBump?: boolean;
}): {
  compatible: boolean;
  reason: string;
} {
  const current = parseSemver(input.currentVersion);
  const target = parseSemver(input.targetVersion);

  if (target.major < current.major) {
    return {
      compatible: false,
      reason: "target major version is older than current",
    };
  }

  if (target.major > current.major && !input.allowMajorBump) {
    return {
      compatible: false,
      reason: "major version bump requires explicit approval",
    };
  }

  if (target.major === current.major && target.minor < current.minor) {
    return {
      compatible: false,
      reason: "target minor version is older than current",
    };
  }

  return {
    compatible: true,
    reason: "schema transition is compatible",
  };
}

export const Governance = {
  verifySeedMatchesCode,
  schemaCompatibilityCheck,
};

export default Governance;
