import "server-only";
import { createClaudeProvider } from "../providers/claude.provider";
import type { AIProvider } from "../providers/types";

const DEFAULT_MODEL = "claude-haiku-4-5";

/**
 * Single provider today. This is the seam where multi-provider routing and
 * tiered "Smart Mode" escalation (cost/quality/latency) will live once there's
 * more than one option — application code never reaches past this into a provider.
 */
export function selectProvider(): AIProvider {
  return createClaudeProvider(DEFAULT_MODEL);
}
