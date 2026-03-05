# AFENDA-NEXUS Agent Resources

This directory contains AI agent skills and tooling for the AFENDA-NEXUS
monorepo. All skill metadata lives in `skills-registry.json`; INDEX.md and
INSTALLED-SKILLS.md are auto-generated from it.

---

## Directory Structure

```
.agents/
  README.md                          # This file
  INDEX.md                           # Auto-generated skill index
  skills-registry.json               # Single source of truth for all skills
  tools/
    agents-gen.mjs                   # Generate INDEX.md + INSTALLED-SKILLS.md
    agents-drift.mjs                 # Drift guard: validate .agents vs PROJECT.md
  skills/
    INSTALLED-SKILLS.md              # Auto-generated detailed skill reference
    SKILL-TEMPLATE.md                # Template for new skills
    <skill-name>/SKILL.md            # One directory per skill
```

---

## Automation

| Command                                            | Purpose                                                 |
| -------------------------------------------------- | ------------------------------------------------------- |
| `node .agents/tools/agents-gen.mjs`                | Regenerate INDEX.md + INSTALLED-SKILLS.md from registry |
| `node .agents/tools/agents-gen.mjs --check`        | Dry-run: report drift without writing                   |
| `node .agents/tools/agents-drift.mjs`              | Full drift guard against PROJECT.md                     |
| `node .agents/tools/agents-drift.mjs --fix`        | Drift guard + auto-fix (regenerate docs)                |
| `node .agents/tools/agents-drift.mjs --section 12` | Check only PROJECT.md section 12                        |

---

## How to Use

### For AI Agents

Skills are referenced by name:

```
@next-best-practices   — Next.js patterns and conventions
@monorepo-management   — Monorepo and workspace setup
@drizzle               — Database schema and queries
@zod                   — Validation and type-safe parsing
@shadcn-ui             — UI components
```

### For Developers

1. **Browse INDEX.md** — Quick reference to all skills by category
2. **Read relevant skills** — Navigate to `skills/<name>/SKILL.md`
3. **Add a skill** — Create directory, add SKILL.md from template, update
   `skills-registry.json`, run `agents-gen.mjs`
4. **Validate** — Run `agents-drift.mjs` to catch drift against PROJECT.md

### For New Team Members

Start with these core skills:

1. **@monorepo-management** — Workspace structure and builds
2. **@next-best-practices** — Next.js patterns
3. **@drizzle** — Database patterns
4. **@clawsec-suite** — Security best practices

---

## Skill Format

Each skill has a `SKILL.md` with YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description (1-2 sentences)
category: nextjs | monorepo | database | validation | ui | tools | security
priority: high | medium | low
---

# Skill Title

Content: commands, code examples, best practices, troubleshooting.
```

---

## Maintenance

### When to Update Skills

- Architecture changes (new layer, dependency changes)
- CLI command additions or changes
- New database patterns emerge
- Official documentation updates

### When to Add New Skills

- New major feature (e.g., async jobs, event sourcing)
- New tooling integration (e.g., GraphQL, WebSockets)
- Cross-cutting concerns emerge (e.g., caching, rate limiting)

### When to Archive Skills

- Technology replaced
- Patterns deprecated

---

## Skill Priorities

- **High (star-star-star)** — Core development, must-know for all developers
- **Medium (star-star)** — Specialized knowledge, needed for specific tasks
- **Low (star)** — Reference material, domain-specific guidance

---

## Related Documentation

- [PROJECT.md](../PROJECT.md) — Architecture spec and conventions
- [INDEX.md](./INDEX.md) — Auto-generated skill index
- [INSTALLED-SKILLS.md](./skills/INSTALLED-SKILLS.md) — Auto-generated detailed
  reference

---

**Maintained by:** AFENDA-NEXUS Team **Contributing:** Follow
[SKILL-TEMPLATE.md](./skills/SKILL-TEMPLATE.md) and update
`skills-registry.json`
