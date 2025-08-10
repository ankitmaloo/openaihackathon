import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { MCPClient } from "@mastra/mcp";
import { createTool } from "@mastra/core";
import { z } from "zod";
import { generateObject } from "ai";
import { createRecord } from "@amp-labs/ai/aisdk";

if (!process.env.AMPERSAND_PROJECT_ID || !process.env.AMPERSAND_API_KEY) {
  throw new Error("AMPERSAND_PROJECT_ID and AMPERSAND_API_KEY must be set");
}

// MCPClient with Ampersand MCP Server using SSE
export const ampersandMcp = new MCPClient({
  servers: {
    "@amp-labs/mcp-server": {
      url: new URL(
        `https://mcp.withampersand.com/v1/sse?${new URLSearchParams({
          apiKey: process.env.AMPERSAND_API_KEY!,
          project: process.env.AMPERSAND_PROJECT_ID,
        })}`
      ),
    },
  },
});

// Sub-agent Definition
const subAgent = new Agent({
  name: "subAgent",
  instructions: `
  You will:
  1. Focus on the single task assigned to you
  2. Use available tools to gather and analyze data
  3. Return results in the requested format
  4. Maintain context of the overall goal

  NEVER NEVER make up data. If you don't have the data, you can't make it up!
  
  You have access to the following tools:
  - Slack tool: Use this to send a message to the user on Slack
  - Notion tool: Use this to create a new page in Notion with the action items discussed with the status of the action items.
  - Stripe tool: Use this to create a new payment link for the user.
  - HubSpot tool: Use this to create a new contact in HubSpot. If the deal is closed, use this to create a new deal in HubSpot with the details of the deal. 

  
  For every response you give, if you use a tool, include the tool name alone in markdown like this: tool: toolName

  `,
  model: openai("gpt-5"),
  defaultStreamOptions: {
    toolChoice: "required",
    toolCallStreaming: true,
    maxSteps: 10,
    maxTokens: 100000,
    onFinish: ({ steps, text, finishReason, usage, reasoningDetails }) => {
      console.log("[SubAgent] Stream complete:", {
        text,
        totalSteps: steps.length,
        reasoningDetails,
        finishReason,
        usage, // This object will contain token usage statistics
      });
    },
  },
});

// Spawn Sub-agent Tool
export const spawnSubagentTool = createTool({
  id: "spawnSubagentTool",
  inputSchema: z.object({
    instructions: z
      .string()
      .describe("The instructions for the sub-agent to follow."),
    task_context: z.string().describe("The context for the sub-agent to use."),
    required_output_format: z
      .string()
      .optional()
      .describe("The required output format for the sub-agent."),
  }),
  description: `Use this tool to spawn a sub-agent for handling specific data gathering and analysis tasks. Provide clear instructions and context for the sub-agent.`,
  outputSchema: z.object({
    result: z.string().optional().describe("The result of the sub-agent."),
    confidence: z.number().optional().describe("The confidence in the result."),
    tools_used: z
      .array(z.string())
      .optional()
      .describe("The name of the tool used to get the result."),
    completion_status: z
      .enum(["success", "partial", "failed"])
      .optional()
      .describe("The status of the task."),
  }),
  execute: async (ctx) => {
    const { instructions, task_context, required_output_format } = ctx.context;
    const agent: typeof subAgent = subAgent;

    const formattedInstructions = `
    Task Instructions: ${instructions}
    
    Context: ${task_context}
    
    ${required_output_format ? `Required Output Format: ${required_output_format}` : ""}
    
    Complete this specific task while keeping in mind the overall GTM engineering context.
    `;

    const result = await agent.generate(formattedInstructions, {
      resourceId: ctx.resourceId || "default",
      threadId: ctx.threadId || "default",
      experimental_output: z.object({
        result: z.string(),
        confidence: z.number(),
        tools_used: z.array(z.string()),
        completion_status: z.enum(["success", "partial", "failed"]),
      }),
    });

    return result.object as {
      result: string;
      confidence: number;
      tools_used: string[];
      completion_status: "success" | "partial" | "failed";
    };
  },
});

// Planning Agent Definition
const planningAgent = new Agent({
  name: "planningAgent",
  instructions: `
  You are a planning agent responsible for breaking down complex data gathering tasks.
  
  NEVER NEVER make up data. If you don't have the data, you can't make it up!
  
  Your job is to:
  1. Analyze the given task related to GTM engineering and data gathering
  2. Break it down into logical steps with the tools you have access to. 
  3. Identify which steps need sub-agents
  4. Create a structured plan with clear objectives for each sub agent and then execute the plan with a sub-agent spawning tool.
  5. ALWAYS use the sub-agent spawning tool to break down queries into manageable steps. If and only if there is a tool for it. If there is not tool for it,  Do not create a sub-agent.
  6. NEVER NEVER simulate any data. If you don't have the data, DO NOT MAKE IT UP!
  
  The sub-agents have access to the following tools, so plan ONLY with these tools:
  - Slack tool: Use this to send a message to the user on Slack
  - Notion tool: Use this to create a new page in Notion with the action items discussed with the status of the action items.
  - Stripe tool: Use this to create a new payment link for the user.
  - HubSpot tool: Use this to create a new contact in HubSpot. If the deal is closed, use this to create a new deal in HubSpot with the details of the deal. 

  Always format your response as a JSON object with:
  - steps: array of steps with descriptions
  - subagent_tasks: array of tasks that should be delegated to sub-agents
  - dependencies: array of relationships between steps
  `,
  model: openai("gpt-5"),
  tools: {
    spawnSubagentTool,
  },
  defaultStreamOptions: {
    toolChoice: "required",
    toolCallStreaming: true,
    maxSteps: 10,
    maxTokens: 100000,
    onFinish: ({ steps, text, finishReason, usage, reasoningDetails }) => {
      console.log("[PlanningAgent] Stream complete:", {
        totalSteps: steps.length,
        finishReason,
        usage, // This object will contain token usage statistics
      });
    },
  },
});

// Shared output schema for action items used across tools and workflows
export const actionItemsOutputSchema = z.object({
  actionItems: z
    .array(
      z.object({
        actionItem: z.string().describe("The action item to be executed."),
        user_name: z.string().describe("The name of the user."),
      })
    )
    .describe("The action items to be executed for the user."),
  product: z.string().describe("The product being discussed."),
});

const actionItemsTool = createTool({
  id: "actionItemsTool",
  inputSchema: z.object({
    conversation: z
      .string()
      .describe(
        "The conversation between two parties for which you need the summary of"
      ),
  }),
  description: `Use this tool list down the action items from the conversation between two parties.`,
  outputSchema: actionItemsOutputSchema,
  execute: async (context) => {
    const { conversation } = context.context;
    const result = await generateObject({
      model: openai.chat("o3"),
      prompt: `List down the action items from the conversation between two parties. The conversation is: ${conversation}`,
      schema: z.object({
        actionItems: z
          .array(
            z.object({
              user_name: z.string().describe("The name of the user."),
              actionItem: z
                .string()
                .describe(
                  "The action item to be executed for this user only. Do not include action items for the other user."
                ),
            })
          )
          .describe("The action items to be executed."),
        product: z.string().describe("The product being discussed."),
      }),
    });
    return {
      actionItems: result.object.actionItems,
      product: result.object.product,
    };
  },
});

// Extractor tool: takes raw agent text and converts to actionItemsOutputSchema
export const actionItemsExtractorTool = createTool({
  id: "actionItemsExtractorTool",
  inputSchema: z.object({
    text: z
      .string()
      .describe("Raw agent output text to extract action items from."),
  }),
  description:
    "Parse the agent's textual output and extract structured action items and product.",
  outputSchema: actionItemsOutputSchema,
  execute: async (ctx) => {
    const { text } = ctx.context;
    const result = await generateObject({
      model: openai.chat("o3"),
      prompt: `From the following text, extract structured action items for each user and the product discussed. If anything is missing, infer from the text but do not make up details.\n\nText:\n${text}`,
      schema: z.object({
        actionItems: z
          .array(
            z.object({
              user_name: z.string().describe("The name of the user."),
              actionItem: z
                .string()
                .describe(
                  "The action item to be executed for this user only. Do not include action items for the other user."
                ),
            })
          )
          .describe("The action items to be executed."),
        product: z.string().describe("The product being discussed."),
      }),
    });
    return {
      actionItems: result.object.actionItems,
      product: result.object.product,
    };
  },
});

// Planning Tool
export const planningTool = createTool({
  id: "planningTool",
  inputSchema: z.object({
    user_name: z
      .array(
        z
          .string()
          .describe("The name of the user. Or the identifier of the user.")
      )
      .describe("The list of the users. Or the identifiers of the users."),
    task: z.string().describe("The task to plan."),
    context: z.string().optional().describe("Additional context for the task."),
  }),
  description: `Use this tool to create a structured plan for the tasks at hand for the user. It will break down the task into steps and identify which parts need sub-agents.`,
  execute: async (ctx) => {
    const { user_name, task, context: taskContext } = ctx.context;
    const agent: typeof planningAgent = planningAgent;

    const instruction = `
    Task to plan: ${task}
    User name: ${user_name}
    ${taskContext ? `Additional context: ${taskContext}` : ""}
    
    Create a detailed plan for accomplishing this
    `;

    const result = await agent.generate(instruction, {
      resourceId: ctx.resourceId || "default",
      threadId: ctx.threadId || "default",
      experimental_output: z.array(
        z.object({
          user_name: z.array(z.string()),
          steps: z.array(
            z.object({
              id: z.string(),
              description: z.string(),
              requires_subagent: z.boolean(),
            })
          ),
          subagent_tasks: z.array(
            z.object({
              step_id: z.string(),
              task_description: z.string(),
              expected_output: z.string(),
            })
          ),
          dependencies: z.array(
            z.object({
              step_id: z.string(),
              depends_on: z.array(z.string()),
            })
          ),
        })
      ),
    });

    return result.object;
  },
});

export const toolCheckerOutputSchema = z.object({
  text: z.string().describe("A brief summary of tool availability checks."),
  checks: z.array(
    z.object({
      user_name: z.string().describe("The name of the user."),
      actionItem: z.string().describe("The action item to be executed."),
      tool_name: z.string().describe("The name of the tool to be used."),
      is_tool_available: z.boolean().describe("Whether the tool is available."),
    })
  ),
});

export const toolCheckerTool = createTool({
  id: "toolCheckerTool",
  inputSchema: actionItemsOutputSchema,
  description: `Use this tool to check if the tool is available for each action item.`,
  outputSchema: toolCheckerOutputSchema,
  execute: async (context: {
    context: {
      actionItems: { actionItem: string; user_name: string }[];
      product: string;
    };
  }) => {
    const { actionItems } = context.context;
    const results: {
      checks: {
        user_name: string;
        actionItem: string;
        tool_name: string;
        is_tool_available: boolean;
      }[];
    } = {
      checks: [],
    };

    for (const actionItem of actionItems) {
      const toolsAvailable = [
        "Slack tool: Use to send a message to the user on Slack",
        "Notion tool: Use to create a new page in Notion with the action items discussed with the status of the action items.",
        "Stripe tool: Use to create a new payment link for the user.",
        "HubSpot tool: Use to create a new contact in HubSpot. If the deal is closed, use this to create a new deal in HubSpot with the details of the deal.",
      ];
      const result = await generateObject({
        model: openai("gpt-4o"),
        prompt: `Check if any of the available tools can completely accomplish this action item. The action item for the user ${actionItem.user_name} is: ${actionItem.actionItem}. The tools available are: ${toolsAvailable.join(
          ", "
        )}`,
        schema: z.object({
          user_name: z.string().describe("The name of the user."),
          is_tool_available: z
            .boolean()
            .describe("Whether the tool is available."),
          actionItem: z.string().describe("The action item to be executed."),
          tool_name: z
            .string()
            .describe(
              "The name of the tool to be used. Always use the slack_tool."
            ),
        }),
      });
      results.checks.push(result.object);
    }
    const summaryText =
      results.checks.length === 0
        ? "No action items to check."
        : results.checks
            .map(
              (c) =>
                `${c.user_name}: "${c.actionItem}" → ${c.is_tool_available ? `Tool: ${c.tool_name}` : "No available tool"}`
            )
            .join("; ");
    return { text: summaryText, checks: results.checks };
  },
});

export const butlerAgent = new Agent({
  name: "butlerAgent",
  instructions: `
  You are an expert note taker & planner cum executor agent that takes in a conversation between two people about one party selling their product
  to other party.
  
  For every conversation you are given here the steps you take in the EXACT order to get the next steps to take for each party: 
  1. Figure out the two parties in the conversation.
  2. Figure out the product that is being sold.
  3. Figure out the price that is being asked for the product.
  4. Figure out the payment terms and conditions of the sale..
  6. Use the actionItems tool to break down the conversation into short actionalable steps for both parties.
  `,
  model: openai("gpt-5"),
  defaultStreamOptions: {
    toolCallStreaming: true,
    maxSteps: 20,
    maxTokens: 100000,
    onFinish: ({ steps, text, finishReason, usage, reasoningDetails }) => {
      console.log("[PVPAgent] Stream complete:", {
        text,
        totalSteps: steps.length,
        reasoningDetails,
        finishReason,
        usage, // This object will contain token usage statistics
      });
    },
  },
});

export const slackMessageTool = createTool({
  id: "slackMessageTool",
  inputSchema: z.object({
    user_name: z.string().describe("The name of the user."),
    message: z
      .string()
      .describe("The action item to be executed, sent on Slack."),
  }),
  description: `Use this tool to send a message to Slack.`,
  execute: async (ctx) => {
    const { message, user_name } = ctx.context;
    const response = await fetch(
      "https://proxy.withampersand.com/chat.postMessage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-amp-project-id":
            process.env.AMPERSAND_PROJECT_ID ||
            "ab2fe72d-0d4d-4c54-a4b1-7276f730f6b4",
          "x-api-key":
            process.env.AMPERSAND_API_KEY ||
            "NAZ2YELVVWV4KFAGXWQINIKHY45UW64GCYN37GA",
          "x-amp-proxy-version": "1",
          "x-amp-integration-name": "create-messages-on-slack",
          "x-amp-group-ref": "user1",
        },
        body: JSON.stringify({
          channel: "C099V4XGVV2",
          text: `[${user_name}]: ${message}`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Slack message failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    return result;
  },
});

export const toolExecutionAgent = new Agent({
  name: "toolExecutionAgent",
  instructions: `
  Use the slackMessageTool to send the actionItem text to Slack for this user as text. and user name as the user_name.
  
  Return the response from the slack response as JSON.
  `,
  model: openai("gpt-5"),
  tools: {
    slackMessageTool,
  },
  defaultStreamOptions: {
    toolChoice: "required",
    toolCallStreaming: true,
    maxSteps: 1,
    maxTokens: 100000,
    onFinish: ({ steps, text, finishReason, usage, reasoningDetails }) => {
      console.log("[ToolExecutionAgent] Stream complete:", {
        text,
        totalSteps: steps.length,
        reasoningDetails,
        finishReason,
        usage, // This object will contain token usage statistics
      });
    },
  },
});
