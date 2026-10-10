import "server-only";
import type { ComplianceResult, Project } from "./schema";
import { checkStoryboardCompliance, storyboardTexts, withoutAcknowledged, type ComplianceIssue } from "./compliance";
import { getBannedHashes, setComplianceResult } from "./db";
import { aiComplianceCheck } from "./claude/compliance-check";

/**
 * The check that must pass before any video is rendered: known names/IDs from
 * the source, patterns, unchecked pictures, and a second reading by Claude.
 */
export async function runFinalCheck(project: Project): Promise<ComplianceResult> {
  const local = checkStoryboardCompliance(project.storyboard, getBannedHashes(project.id));
  let ai: { issues: ComplianceIssue[]; ran: boolean } = { issues: [], ran: false };
  try {
    ai = await aiComplianceCheck(storyboardTexts(project.storyboard));
  } catch (err) {
    console.error("AI final check failed; using the automatic checks only", err);
  }
  // One entry per (problem, place).
  const seen = new Set<string>();
  const merged = [...local, ...ai.issues].filter((i) => {
    const k = `${i.key}|${i.where}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const result: ComplianceResult = {
    checkedAt: new Date().toISOString(),
    issues: withoutAcknowledged(merged, project.compliance.acknowledged),
    aiChecked: ai.ran,
  };
  setComplianceResult(project.id, result);
  return result;
}
