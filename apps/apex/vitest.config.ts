import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 20000,
    // Integration tests share one Postgres DB and truncate tables in
    // beforeEach — running test files in parallel workers causes them
    // to stomp each other's state. Force sequential execution.
    fileParallelism: false,
  },
});
