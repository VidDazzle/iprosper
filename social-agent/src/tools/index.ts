import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Orchestrator } from "../core/orchestrator.js";

/**
 * MCP tool surface for interactive control: check status, trigger a run,
 * flip autopilot on/off, inspect recent posts. The agent does NOT need a
 * connected MCP client to keep running — see cli.ts's `daemon` mode, which
 * drives the same Orchestrator unattended via the Scheduler. These tools are
 * for when you (or any LLM/app wired to this MCP server) want to check in
 * or intervene.
 */
export function registerTools(server: McpServer, orchestrator: Orchestrator) {
  server.registerTool(
    "list_accounts",
    {
      title: "List configured social accounts",
      description: "Lists every social media account configured for this agent, with platform and status.",
      inputSchema: {},
    },
    async () => {
      const accounts = orchestrator.getConfig().accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        displayName: a.displayName,
        enabled: a.enabled,
        postsPerDay: a.postsPerDay,
        postingWindow: a.postingWindow,
      }));
      return { content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }] };
    }
  );

  server.registerTool(
    "list_campaigns",
    {
      title: "List campaigns",
      description: "Lists every configured campaign, its target accounts, quality threshold, and autopilot state.",
      inputSchema: {},
    },
    async () => {
      const state = orchestrator.getState();
      const campaigns = orchestrator.getConfig().campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        niche: c.niche,
        accountIds: c.accountIds,
        qualityThreshold: c.qualityThreshold,
        autopilotEnabled: state.isAutopilotEnabled(c.id),
      }));
      return { content: [{ type: "text", text: JSON.stringify(campaigns, null, 2) }] };
    }
  );

  server.registerTool(
    "run_campaign_now",
    {
      title: "Run a campaign immediately",
      description:
        "Generates one piece of content for the given campaign (idea -> script -> render -> quality gate) " +
        "and, if it clears the quality/policy bar, posts it to every account the campaign targets. Runs the " +
        "exact same code path the autonomous scheduler uses.",
      inputSchema: { campaignId: z.string() },
    },
    async ({ campaignId }) => {
      const summary = await orchestrator.runCampaignOnce(campaignId);
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.registerTool(
    "start_autopilot",
    {
      title: "Start autonomous posting for a campaign",
      description:
        "Enables unattended operation for a campaign: the scheduler will generate and post content at every " +
        "configured posting-window slot with no further approval required.",
      inputSchema: { campaignId: z.string() },
    },
    async ({ campaignId }) => {
      orchestrator.startAutopilot(campaignId);
      return { content: [{ type: "text", text: `Autopilot enabled for campaign "${campaignId}".` }] };
    }
  );

  server.registerTool(
    "stop_autopilot",
    {
      title: "Stop autonomous posting for a campaign",
      description: "Disables unattended scheduled runs for a campaign. Manual run_campaign_now still works.",
      inputSchema: { campaignId: z.string() },
    },
    async ({ campaignId }) => {
      orchestrator.stopAutopilot(campaignId);
      return { content: [{ type: "text", text: `Autopilot disabled for campaign "${campaignId}".` }] };
    }
  );

  server.registerTool(
    "get_recent_posts",
    {
      title: "Get recent posts",
      description: "Returns the most recent post attempts across all accounts, success/failure and remote links.",
      inputSchema: { limit: z.number().int().min(1).max(200).optional() },
    },
    async ({ limit }) => {
      const posts = orchestrator.getState().listRecentPosts(limit ?? 50);
      return { content: [{ type: "text", text: JSON.stringify(posts, null, 2) }] };
    }
  );

  server.registerTool(
    "get_recent_content",
    {
      title: "Get recent generated content for a campaign",
      description: "Returns recently generated content items for a campaign, including quality scores.",
      inputSchema: { campaignId: z.string(), limit: z.number().int().min(1).max(100).optional() },
    },
    async ({ campaignId, limit }) => {
      const items = orchestrator.getState().listRecentContent(campaignId, limit ?? 20);
      return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.registerTool(
    "get_run_log",
    {
      title: "Get recent run log",
      description: "Tails the internal event log (quality rejections, post failures, scheduler activity).",
      inputSchema: { limit: z.number().int().min(1).max(500).optional() },
    },
    async ({ limit }) => {
      const log = orchestrator.getState().tailLog(limit ?? 100);
      return { content: [{ type: "text", text: JSON.stringify(log, null, 2) }] };
    }
  );
}
