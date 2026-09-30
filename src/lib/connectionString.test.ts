import { describe, expect, it } from "vitest";
import { withVerifyFull } from "./connectionString";

describe("withVerifyFull", () => {
  it.each(["prefer", "require", "verify-ca"])("troca sslmode=%s por verify-full", (mode) => {
    const result = withVerifyFull(`postgresql://u:p@host/db?sslmode=${mode}&channel_binding=require`);
    expect(new URL(result).searchParams.get("sslmode")).toBe("verify-full");
    expect(new URL(result).searchParams.get("channel_binding")).toBe("require");
  });

  it("mantem urls sem sslmode ou com outro modo", () => {
    expect(withVerifyFull("postgresql://u:p@host/db")).toBe("postgresql://u:p@host/db");
    expect(withVerifyFull("postgresql://u:p@host/db?sslmode=disable")).toBe("postgresql://u:p@host/db?sslmode=disable");
  });
});
