/**
 * Claim-Artefact Verifier
 *
 * Detects lies: when claims don't match artefacts.
 * "10 URLs scraped" but only 1 file? → STOP.
 */

import * as fs from "fs";
import * as path from "path";

export interface ClaimVerification {
  claim: string;
  claimedCount: number;
  actualCount: number;
  verified: boolean;
  discrepancy: number;
  evidence: string[];
}

export interface VerificationResult {
  allVerified: boolean;
  totalClaims: number;
  verifiedClaims: number;
  failedClaims: ClaimVerification[];
  passedClaims: ClaimVerification[];
}

/**
 * Claim patterns we look for
 */
const CLAIM_PATTERNS = [
  { pattern: /scraped\s+(\d+)\s*(urls?|pages?|sites?|portals?)/i, type: "scrape" },
  { pattern: /created\s+(\d+)\s*(files?|components?|modules?)/i, type: "file" },
  { pattern: /implemented\s+(\d+)\s*(features?|endpoints?|apis?)/i, type: "feature" },
  { pattern: /fixed\s+(\d+)\s*(bugs?|issues?|errors?)/i, type: "fix" },
  { pattern: /added\s+(\d+)\s*(tests?|specs?)/i, type: "test" },
  { pattern: /deployed\s+(\d+)\s*(services?|instances?)/i, type: "deploy" },
];

/**
 * Verify claims against artefacts
 */
export function verifyClaims(
  content: string,
  artefacts: string[],
  projectRoot?: string
): VerificationResult {
  const verifications: ClaimVerification[] = [];

  for (const { pattern, type } of CLAIM_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern, "gi"));

    for (const match of matches) {
      const claimedCount = parseInt(match[1], 10);
      const claim = match[0];

      // Count relevant artefacts
      const relevantArtefacts = filterArtefactsByType(artefacts, type, projectRoot);
      const actualCount = relevantArtefacts.length;

      const verification: ClaimVerification = {
        claim,
        claimedCount,
        actualCount,
        verified: actualCount >= claimedCount,
        discrepancy: claimedCount - actualCount,
        evidence: relevantArtefacts,
      };

      verifications.push(verification);
    }
  }

  const failedClaims = verifications.filter((v) => !v.verified);
  const passedClaims = verifications.filter((v) => v.verified);

  return {
    allVerified: failedClaims.length === 0,
    totalClaims: verifications.length,
    verifiedClaims: passedClaims.length,
    failedClaims,
    passedClaims,
  };
}

/**
 * Filter artefacts by claim type
 */
function filterArtefactsByType(
  artefacts: string[],
  type: string,
  projectRoot?: string
): string[] {
  const relevant: string[] = [];

  for (const artefact of artefacts) {
    // Check if artefact exists (if projectRoot provided)
    if (projectRoot) {
      const fullPath = path.join(projectRoot, artefact);
      if (!fs.existsSync(fullPath)) {
        continue; // Skip non-existent artefacts
      }
    }

    switch (type) {
      case "scrape":
        // Look for data files, JSON, CSV
        if (/\.(json|csv|xml|html|txt)$/i.test(artefact)) {
          relevant.push(artefact);
        }
        break;

      case "file":
        // Any file counts
        relevant.push(artefact);
        break;

      case "feature":
        // Source files
        if (/\.(ts|js|tsx|jsx|py|go|rs|java)$/i.test(artefact)) {
          relevant.push(artefact);
        }
        break;

      case "fix":
        // Modified source files
        if (/\.(ts|js|tsx|jsx|py|go|rs|java)$/i.test(artefact)) {
          relevant.push(artefact);
        }
        break;

      case "test":
        // Test files
        if (/\.(test|spec)\.(ts|js|tsx|jsx)$/i.test(artefact) || /tests?\//i.test(artefact)) {
          relevant.push(artefact);
        }
        break;

      case "deploy":
        // Deploy/config files
        if (/\.(yaml|yml|json|toml|dockerfile)$/i.test(artefact) || /docker|k8s|deploy/i.test(artefact)) {
          relevant.push(artefact);
        }
        break;

      default:
        relevant.push(artefact);
    }
  }

  return relevant;
}

/**
 * Generate a verification report
 */
export function generateVerificationReport(result: VerificationResult): string {
  const lines: string[] = [];

  lines.push("# Claim Verification Report");
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Total Claims: ${result.totalClaims}`);
  lines.push(`- Verified: ${result.verifiedClaims}`);
  lines.push(`- Failed: ${result.failedClaims.length}`);
  lines.push(`- Status: ${result.allVerified ? "✅ ALL VERIFIED" : "❌ VERIFICATION FAILED"}`);
  lines.push("");

  if (result.failedClaims.length > 0) {
    lines.push("## ❌ Failed Claims (STOP REQUIRED)");
    lines.push("");

    for (const failed of result.failedClaims) {
      lines.push(`### "${failed.claim}"`);
      lines.push(`- Claimed: ${failed.claimedCount}`);
      lines.push(`- Actual: ${failed.actualCount}`);
      lines.push(`- Discrepancy: ${failed.discrepancy} missing`);
      lines.push(`- Evidence found:`);
      if (failed.evidence.length === 0) {
        lines.push("  - (none)");
      } else {
        for (const e of failed.evidence) {
          lines.push(`  - ${e}`);
        }
      }
      lines.push("");
    }
  }

  if (result.passedClaims.length > 0) {
    lines.push("## ✅ Verified Claims");
    lines.push("");

    for (const passed of result.passedClaims) {
      lines.push(`- "${passed.claim}" → ${passed.actualCount} artefacts found`);
    }
  }

  return lines.join("\n");
}
