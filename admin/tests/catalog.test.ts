import { expect, it } from "vitest";
import applicationPackage from "../../app/package.json";
import adminPackage from "../package.json";
import { release, toolNames, catalogueRows, matchesTool } from "../src/catalog";
import { handle } from "../worker/index";

it("uses the current public catalogue and preserves the stable Office metric identifier", () => {
  expect(Object.keys(toolNames)).toHaveLength(34);
  expect(toolNames.documentsToPdf).toBe("Office para PDF");
  expect(toolNames.pdfToOffice).toBe("PDF para Office");
  expect(release.applicationVersion).toBe(applicationPackage.version);
  expect(release.adminVersion).toBe(adminPackage.version);
});
it("finds Office conversions by aliases, accents and word order", () => {
  expect(matchesTool("documentsToPdf", "Word para PDF")).toBe(true);
  expect(matchesTool("documentsToPdf", "ODS")).toBe(true);
  expect(matchesTool("pdfToOffice", "PDF para PowerPoint")).toBe(true);
  expect(matchesTool("pdfToOffice", "Excel")).toBe(true);
  expect(matchesTool("rotate", "girar páginas")).toBe(true);
  expect(matchesTool("rotate", "Word")).toBe(false);
});
it("shows tools without fabricating usage and retains legacy records", () => {
  const empty = catalogueRows([]);
  expect(empty).toHaveLength(34);
  expect(empty.every(row => !row.recorded)).toBe(true);
  const rows = catalogueRows([{tool:"documentsToPdf",completed:7,failed:2}, {tool:"legacyTool",completed:1,failed:0}]);
  expect(rows.find(row => row.tool === "documentsToPdf")).toEqual({tool:"documentsToPdf",completed:7,failed:2,recorded:true});
  expect(rows.find(row => row.tool === "pdfToOffice")?.recorded).toBe(false);
  expect(rows.find(row => row.tool === "legacyTool")?.completed).toBe(1);
});
it("reports admin and application versions separately without requiring credentials", async () => {
  const env = {APP_ORIGIN:"https://admin.example.test",ENVIRONMENT:"staging"} as Env;
  const response = await handle(new Request(env.APP_ORIGIN + "/api/health"), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({status:"available",environment:"staging",version:release.adminVersion,appVersion:release.applicationVersion,appRevision:release.applicationRevision,toolCount:34,officeEngineVersion:release.officeEngineVersion});
});
