import pino from "pino";

const level = process.env.LOG_LEVEL || "info";
const pretty = process.env.LOG_PRETTY !== "false";

export const logger = pino(
  pretty
    ? {
        level,
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : { level }
);

export function childLogger(scope: string) {
  return logger.child({ scope });
}
