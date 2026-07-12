import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext adapter config for deploying Next.js to Cloudflare Workers.
export default {
  ...defineCloudflareConfig(),
  cloudflare: {
    // Resolve deps with Node conditions rather than "workerd". The libSQL
    // client's WebSocket shim only ships a traced Node entry; the workerd
    // condition points at an untraced file. We talk to Turso over HTTPS, so
    // the Node-resolved transport bundles cleanly under nodejs_compat.
    useWorkerdCondition: false,
  },
};
