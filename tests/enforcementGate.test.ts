/**
 * Tests for Enforcement Gate - Hard STOP enforcement
 */

import { test } from "node:test";
import assert from "node:assert";
import { verifyClaims, generateVerificationReport } from "../src/audit/claimVerifier.js";

test("verifyClaims detects unproven scraping claims", () => {
  const content = "Successfully scraped 10 portals and stored the data";
  const artefacts = ["data/portal1.json"]; // Only 1 artefact for 10 claimed

  const result = verifyClaims(content, artefacts);

  assert.strictEqual(result.allVerified, false);
  assert.strictEqual(result.failedClaims.length, 1);
  assert.strictEqual(result.failedClaims[0].claimedCount, 10);
  assert.strictEqual(result.failedClaims[0].actualCount, 1);
  assert.strictEqual(result.failedClaims[0].discrepancy, 9);
});

test("verifyClaims passes when artefacts match claims", () => {
  const content = "Created 3 files for the feature";
  const artefacts = ["src/feature.ts", "src/types.ts", "src/utils.ts"];

  const result = verifyClaims(content, artefacts);

  assert.strictEqual(result.allVerified, true);
  assert.strictEqual(result.failedClaims.length, 0);
  assert.strictEqual(result.passedClaims.length, 1);
});

test("verifyClaims handles no claims in content", () => {
  const content = "Fixed a bug in the login flow";
  const artefacts = ["src/login.ts"];

  const result = verifyClaims(content, artefacts);

  assert.strictEqual(result.allVerified, true);
  assert.strictEqual(result.totalClaims, 0);
});

test("verifyClaims detects multiple unproven claims", () => {
  const content = "Implemented 5 features and added 10 tests";
  const artefacts = ["src/feature1.ts", "tests/test1.test.ts"];

  const result = verifyClaims(content, artefacts);

  assert.strictEqual(result.allVerified, false);
  assert.strictEqual(result.failedClaims.length, 2);
});

test("generateVerificationReport creates readable output", () => {
  const content = "Scraped 5 URLs";
  const artefacts = ["data/url1.json"];

  const result = verifyClaims(content, artefacts);
  const report = generateVerificationReport(result);

  assert.ok(report.includes("Claim Verification Report"));
  assert.ok(report.includes("VERIFICATION FAILED"));
  assert.ok(report.includes("Claimed: 5"));
  assert.ok(report.includes("Actual: 1"));
});

test("verifyClaims filters artefacts by type correctly", () => {
  const content = "Added 2 tests";
  const artefacts = [
    "src/feature.ts", // Not a test file
    "tests/feature.test.ts", // Test file
    "tests/utils.test.ts", // Test file
  ];

  const result = verifyClaims(content, artefacts);

  assert.strictEqual(result.allVerified, true);
  assert.strictEqual(result.passedClaims[0].actualCount, 2);
});
