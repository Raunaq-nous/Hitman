import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkFile, checkTree } from "../architecture/layering";

const root = process.cwd();

describe("architecture layering", () => {
  it("src/ has no layering violations", () => {
    expect(checkTree(join(root, "src")).map((v) => `${v.file}: ${v.message}`)).toEqual([]);
  });

  it("catches the deliberately bad imports in the fixture, with fix-it messages", () => {
    const v = checkTree(join(root, "tests/fixtures/arch-bad/src"));
    const byFile = Object.fromEntries(v.map((x) => [x.file, x.message]));
    expect(byFile["domain/crews/types.ts"]).toMatch(/layering: .*types.*service.*move the shared code down/);
    expect(byFile["engine/impure.ts"]).toMatch(/src\/engine is pure.*Move I\/O/);
    expect(byFile["ui/Leaky.ts"]).toMatch(/src\/ui never touches the database/);
    expect(v).toHaveLength(3);
  });

  it("allows forward dependencies and flags cross-domain repo access", () => {
    const src = join(root, "src");
    const file = join(src, "domain/lab/service.ts");
    expect(checkFile(src, file, `import { x } from "./repo"; import type { T } from "@/domain/lab/types";`)).toEqual([]);
    expect(checkFile(src, file, `import { r } from "@/domain/crews/repo";`)[0].message).toMatch(/another domain's repo/);
    expect(checkFile(src, file, `import { g } from "@/llm/provider";`)[0].message).toMatch(/src\/providers/);
    expect(checkFile(src, file, `import { p } from "@/app/page";`)[0].message).toMatch(/must not depend on src\/app/);
    expect(checkFile(src, join(src, "engine/x.ts"), `import { y } from "./y"; import { z } from "@/engine/z";`)).toEqual([]);
  });
});
