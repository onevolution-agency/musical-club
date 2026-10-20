import { describe, expect, it } from "vitest";
import { isHandheldInstallTarget } from "./install-target";

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const desktop = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

describe("install banner target", () => {
  it("stays off desktop, even in a narrow window", () => {
    expect(isHandheldInstallTarget({ userAgent: desktop, finePointer: true, coarsePointer: false, narrow: false })).toBe(false);
    expect(isHandheldInstallTarget({ userAgent: desktop, finePointer: true, coarsePointer: false, narrow: true })).toBe(false);
  });

  it("shows on a phone", () => {
    expect(isHandheldInstallTarget({ userAgent: iphone, finePointer: false, coarsePointer: true, narrow: true })).toBe(true);
    expect(isHandheldInstallTarget({ userAgent: iphone, finePointer: true, coarsePointer: false, narrow: true })).toBe(true);
  });

  it("shows on a coarse narrow screen without a desktop pointer", () => {
    expect(isHandheldInstallTarget({ userAgent: desktop, finePointer: false, coarsePointer: true, narrow: true })).toBe(true);
    expect(isHandheldInstallTarget({ userAgent: desktop, finePointer: false, coarsePointer: true, narrow: false })).toBe(false);
  });
});
