---
trigger: always_on
description: TypeScript, layering and file conventions enforced by lint rules
---

# Code style
- TypeScript strict; no `any` without a comment explaining why; exported functions have explicit return types.
- Layering per `ARCHITECTURE.md` (`types → config → repo → service → api|ui`); `src/engine` is pure; `src/ui` never imports Prisma.
- Zod at every boundary; DTOs to the client; never serialise Prisma models.
- Files ≤ 400 lines; functions ≤ 60 lines where practical; descriptive names; no dead code.
- Structured JSON logging through `src/providers/log.ts`; no `console.log` in committed server code.
- Custom lint rules carry remediation text in their error messages.
