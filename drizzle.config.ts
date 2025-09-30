// drizzle.config.ts

const config = {
  schema: "./src/lib/schema.ts",   // adjust path to your schema
  out: "./drizzle",
  driver: "better-sqlite",         // v0.18.1 uses driver
  dbCredentials: {
    url: "./sqlite.db"
  },
};

export default config;
