import { createServerFn } from "@tanstack/react-start";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";

const AnalyzeInput = z.object({
  fuelPercent: z.number(),
  fuelLiters: z.number(),
  flowDelta: z.number(),
  pressureKpa: z.number(),
  temperatureC: z.number(),
  leakActive: z.boolean(),
  recentAlerts: z.array(
    z.object({
      message: z.string(),
      severity: z.string(),
      confidence: z.number(),
    }),
  ),
});

export const analyzeFuelAnomaly = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createOpenAICompatible({
      name: "lovable-ai",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key },
    });

    const { text } = await generateText({
      model: gateway("google/gemini-3.1-flash-lite"),
      system:
        "You are an AI fuel-integrity analyst for a fleet vehicle monitoring system. Given live sensor telemetry, explain in 3 short plain-language paragraphs: (1) what the data indicates about a possible fuel leak, (2) the likely cause, (3) the immediate action the driver should take. Be concise, technical but readable, and safety-first. No markdown headers, no bullet lists.",
      prompt: JSON.stringify(data),
    });

    return { analysis: text };
  });
