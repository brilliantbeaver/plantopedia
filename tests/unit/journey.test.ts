import { journeyState } from "../../src/features/journey/model.js";
import { startProgress } from "../../src/features/rewards/rules.js";
const fresh = () => startProgress(Date.parse("2026-11-07T12:00:00Z"), "UTC");
test("unavailable metadata or collection is not reported as a new journey", () => {
  expect(journeyState(undefined, 0)).toBeUndefined();
  expect(journeyState(fresh(), undefined)).toBeUndefined();
  expect(journeyState(null, 0)?.done).toEqual([false, false, false]);
});
test("only earned discovery claims count and later checkpoints are independent", () => {
  const p = fresh();
  p.claims["action:discovery_pending"] = 0;
  p.claims["discovery:uncredited"] = 0;
  expect(journeyState(p, 1)?.done).toEqual([false, true, false]);
  p.claims["discovery:sunflower"] = 5;
  expect(journeyState(p, 1)?.next).toBe(2);
  p.careDays = ["2026-11-01", "2026-11-03", "2026-11-07", "2026-11-07"];
  expect(journeyState(p, 1)).toEqual({
    done: [true, true, true],
    days: 3,
    completed: 3,
    next: -1,
  });
  expect(journeyState(p, 0)?.done).toEqual([true, false, true]);
  expect(journeyState(p, 0)?.next).toBe(1);
});
test("duplicate care dates do not satisfy three different days", () => {
  const p = fresh();
  p.careDays = ["2026-11-07", "2026-11-07", "2026-11-07"];
  expect(journeyState(p, 1)?.days).toBe(1);
  expect(journeyState(p, 1)?.done[2]).toBe(false);
});
