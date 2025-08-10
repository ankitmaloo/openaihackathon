import express from "express";
import cors from "cors";
import { mastra } from "./mastra";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text()); // This allows us to handle raw text in request body

// POST endpoint to run Mastra workflow
app.post("/workflow", async (req, res) => {
  try {
    // Get the text from request body
    const inputText = req.body?.conversation;

    console.log("Received input:", inputText);

    // Create a workflow run
    const run = await mastra.getWorkflow("butlerWorkflow").createRunAsync();

    // Start the workflow with the input text
    const result = await run.start({
      inputData: {
        conversation: inputText,
      },
    });

    console.log("Workflow result:", result);

    // Return the result
    res.json({
      success: true,
      result: result,
    });
  } catch (error) {
    console.error("Error running workflow:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`POST to http://localhost:${PORT}/workflow with text in body`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
