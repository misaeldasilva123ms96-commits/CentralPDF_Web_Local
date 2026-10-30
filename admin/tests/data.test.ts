import { it, expect } from "vitest";
import { summarize, csvCell, toolNames } from "../src/data";
import { strongPassword } from "../src/auth";
it("aggregates received counts without inventing people or missing activity", () => {
  expect(summarize([])).toEqual([]);
  expect(
    summarize([
      { day: "2026-10-29", tool: "merge", completed: 2, failed: 1 },
      { day: "2026-10-30", tool: "merge", completed: 3, failed: 0 },
    ]),
  ).toEqual([{ tool: "merge", completed: 5, failed: 1 }]);
  expect(Object.keys(toolNames)).toHaveLength(34);
});
it("preserves Unicode and spaces while quoting CSV and neutralizing formula cells", () => {
  expect(csvCell("Medição de páginas")).toBe('"Medição de páginas"');
  expect(csvCell('Texto; com "aspas"')).toBe('"Texto; com ""aspas"""');
  expect(csvCell("=SUM(1,2)")).toBe('"\'=SUM(1,2)"');
});
it("rejects predictable numeric passwords and accepts long passphrases", () => {
  expect(strongPassword("111111111111")).toBe(false);
  expect(strongPassword("1234")).toBe(false);
  expect(strongPassword("Frase de acesso segura!")).toBe(true);
});
