/**
 * Tests for STOP Scorer
 */

import { test } from "node:test";
import assert from "node:assert";
import { computeStopScore, analyzeContent, type StopReason } from "../src/audit/stopScorer.js";

test("computeStopScore returns LOW severity for empty reasons", () => {
  const result = computeStopScore([]);

  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.severity, "LOW");
  assert.strictEqual(result.stopRequired, false);
});

test("computeStopScore returns HIGH severity for pricing violation", () => {
  const reasons: StopReason[] = ["PRICING_WITHOUT_FACT"];
  const result = computeStopScore(reasons);

  assert.strictEqual(result.score, 40);
  assert.strictEqual(result.severity, "HIGH");
  assert.strictEqual(result.stopRequired, true);
});

test("computeStopScore returns CRITICAL severity for multiple violations", () => {
  const reasons: StopReason[] = [
    "PRICING_WITHOUT_FACT",
    "LEGAL_STATEMENT",
    "UNPROVEN_CLAIM",
  ];
  const result = computeStopScore(reasons);

  assert.strictEqual(result.score, 100); // 40 + 40 + 30 = 110, capped at 100
  assert.strictEqual(result.severity, "CRITICAL");
  assert.strictEqual(result.stopRequired, true);
});

test("computeStopScore returns MEDIUM severity for missing tests only", () => {
  const reasons: StopReason[] = ["MISSING_TESTS", "MISSING_DEPLOY_CONFIG"];
  const result = computeStopScore(reasons);

  assert.strictEqual(result.score, 30); // 15 + 15
  assert.strictEqual(result.severity, "MEDIUM");
  assert.strictEqual(result.stopRequired, false);
});

test("analyzeContent detects pricing without UNKNOWN marker", () => {
  const content = "Set the price to $99/month";
  const reasons = analyzeContent(content);

  assert.ok(reasons.includes("PRICING_WITHOUT_FACT"));
});

test("analyzeContent does not flag pricing with UNKNOWN marker", () => {
  const content = "Price is UNKNOWN - requires approval";
  const reasons = analyzeContent(content);

  assert.ok(!reasons.includes("PRICING_WITHOUT_FACT"));
});

test("analyzeContent detects legal statements", () => {
  const content = "Added legal disclaimer to the footer";
  const reasons = analyzeContent(content);

  assert.ok(reasons.includes("LEGAL_STATEMENT"));
});

test("analyzeContent detects unproven claims", () => {
  const content = "Successfully implemented the feature";
  const reasons = analyzeContent(content);

  assert.ok(reasons.includes("UNPROVEN_CLAIM"));
});

test("analyzeContent does not flag claims with file references", () => {
  const content = "Implemented in file: src/feature.ts";
  const reasons = analyzeContent(content);

  assert.ok(!reasons.includes("UNPROVEN_CLAIM"));
});
