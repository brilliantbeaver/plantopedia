import { expect, test } from "@jest/globals";
import { navigationLayout } from "../../src/theme/navigation-layout.js";
test.each([320, 390, 600, 768, 1024, 1440, 2560])(
  "navigation stays centered within %ipx and has five usable targets",
  (width) => {
    const layout = navigationLayout(width, 1);
    expect(layout.left).toBeGreaterThanOrEqual(8);
    expect(layout.left * 2 + layout.width).toBe(width);
    expect(layout.width / 5).toBeGreaterThanOrEqual(44);
    expect(layout.width).toBeLessThanOrEqual(1040);
    expect(layout.labelSize).toBeGreaterThanOrEqual(14);
  },
);
test("wide screens use horizontal labels; large fonts restore stacked labels and clearance", () => {
  expect(navigationLayout(390, 1).horizontal).toBe(false);
  expect(navigationLayout(1024, 1).horizontal).toBe(true);
  const accessible = navigationLayout(1024, 2);
  expect(accessible.horizontal).toBe(false);
  expect(accessible.height).toBeGreaterThan(navigationLayout(1024, 1).height);
  const landscape = navigationLayout(844, 1, 59, 34);
  expect(landscape.left).toBeGreaterThan(59);
  expect(landscape.left + landscape.width).toBeLessThan(844 - 34);
});
