import { Mastra } from "@mastra/core/mastra";

import { butlerAgent, toolExecutionAgent } from "./agents";
import { PinoLogger } from "@mastra/loggers";
import { butlerWorkflow } from "./workflows/butlerWorkflow";
import { LibSQLStore } from "@mastra/libsql";

export const mastra = new Mastra({
  storage: new LibSQLStore({
    url: "file:./mastra.db",
  }),
  agents: {
    butlerAgent,
    toolExecutionAgent,
  },
  workflows: {
    butlerWorkflow,
  },
  logger: new PinoLogger({
    name: "ButlerAgent",
    level: "debug",
  }),
  server: {
    // Disable CORS
    timeout: 120000, // 120 seconds
    cors: {
      origin: "*",
      allowMethods: ["*"],
      allowHeaders: ["*"],
    },
  },
});
