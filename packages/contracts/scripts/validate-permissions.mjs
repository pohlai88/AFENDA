import {
  PermissionValues,
  validatePermissionVocabulary,
  PermissionMeta,
} from "../dist/shared/permissions.js";

function main() {
  const issues = validatePermissionVocabulary(PermissionValues);

  for (const [key, meta] of Object.entries(PermissionMeta)) {
    if (meta.replacedBy && !PermissionValues.includes(meta.replacedBy)) {
      issues.push(`PermissionMeta replacement target does not exist: ${key} -> ${meta.replacedBy}`);
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`permissions-check: ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`permissions-check: OK (${PermissionValues.length} canonical permissions)`);
}

main();
