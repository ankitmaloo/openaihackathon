import { createStep, createWorkflow } from "@mastra/core";
import { z } from "zod";
import { butlerAgent } from "../agents/bulter-agent";
import {
  slackMessageTool,
  toolExecutionAgent,
  toolCheckerTool,
  toolCheckerOutputSchema,
  actionItemsExtractorTool,
} from "../agents/bulter-agent";

const butletStep = createStep(butlerAgent);
const toolCheckerStep = createStep(toolCheckerTool);
const executeTool = createStep(slackMessageTool);

export const butlerWorkflow = createWorkflow({
  id: "butler-workflow",
  inputSchema: z.object({
    conversation: z.string().describe("The conversation between two parties."),
  }),
  outputSchema: toolCheckerOutputSchema,
})
  .map(async ({ inputData }) => {
    const { conversation } = inputData;
    return {
      prompt: `Have butler agent create action items & execute them from this conversation: ${conversation}`,
    };
  })

  .then(butletStep)
  // The first step returns raw agent text; extract structured action items next
  .then(createStep(actionItemsExtractorTool))
  // Now we have actionItemsOutputSchema, which matches toolChecker input
  .then(toolCheckerStep)
  .map(async ({ inputData }) => {
    const { checks } = inputData;
    const toExecute = checks.filter((check) => check.is_tool_available);
    return toExecute;
    // TODO: uncomment when toolExecutor is tested / return toExecute;
  })
  .foreach(executeTool)
  .commit();
