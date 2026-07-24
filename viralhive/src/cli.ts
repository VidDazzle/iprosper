#!/usr/bin/env node
import { loadConfig } from "./config/config.js";
import { StateStore } from "./core/state.js";
import { Orchestrator } from "./core/orchestrator.js";
import { Scheduler } from "./core/scheduler.js";
import { childLogger } from "./core/logger.js";

const log = childLogger("cli");

function usage() {
  console.log(`ViralHive <command>

Commands:
  daemon              Run forever: autonomous scheduler posts to every
                       campaign's accounts at their configured windows.
                       This is the "no assistance needed" mode — run it
                       under pm2/systemd/Docker/Termux and walk away.
  run <campaignId>     Run one campaign cycle immediately and exit.
  status                Print autopilot state and recent post results.
  help                  Show this message.
`);
}

async function main() {
  const [, , command, arg] = process.argv;

  if (!command || command === "help" || command === "--help") {
    usage();
    return;
  }

  const config = loadConfig();
  const state = new StateStore(config.dbPath);
  const orchestrator = new Orchestrator(config, state);

  switch (command) {
    case "daemon": {
      const scheduler = new Scheduler(orchestrator);
      scheduler.start();
      log.info("daemon started; autonomous posting is live for every autopilot-enabled campaign");

      const shutdown = () => {
        log.info("shutting down daemon");
        scheduler.stop();
        state.close();
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);

      // Keep the event loop alive; node-cron's internal timers already do
      // this, but an explicit heartbeat makes the intent obvious and gives
      // us a place to add health-check pings later.
      setInterval(() => {}, 1 << 30);
      break;
    }

    case "run": {
      if (!arg) {
        console.error("Usage: viralhive run <campaignId>");
        process.exit(1);
      }
      const summary = await orchestrator.runCampaignOnce(arg);
      console.log(JSON.stringify(summary, null, 2));
      state.close();
      break;
    }

    case "status": {
      const campaigns = config.campaigns.map((c) => ({
        id: c.id,
        autopilot: state.isAutopilotEnabled(c.id) || c.autopilot,
      }));
      const recentPosts = state.listRecentPosts(20);
      console.log(JSON.stringify({ campaigns, recentPosts }, null, 2));
      state.close();
      break;
    }

    default:
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  log.error({ err }, "fatal CLI error");
  process.exit(1);
});
