import { NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

const client =
  process.env.OPENAI_API_KEY?.length ? new OpenAI() : null;

export async function POST(request: Request) {
  const { history, prompt } = (await request.json()) as {
    history: { role: "user" | "assistant"; text: string }[];
    prompt: string;
  };

  if (!prompt || !Array.isArray(history)) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }

  if (!client) {
    return NextResponse.json({
      header: "Local mock reply",
      message: `Mock response for: ${prompt}\n\nHistory length: ${history.length}`,
    });
  }

  const systemPrompt =
    "You are Tree GPT. Always respond with strict JSON containing `header` and `message` keys. The `message` field must be valid markdown. Use the provided history array to stay consistent.";

  try {
    const response = await client.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: systemPrompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({ history, prompt }),
            },
          ],
        },
      ],
    });

    const text = response.output_text;
    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({
        header: parsed.header ?? "Untitled branch",
        message: parsed.message ?? "No message returned.",
      });
    } catch {
      return NextResponse.json(
        {
          header: "Tree GPT",
          message: text || "Unable to parse model response.",
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to reach OpenAI" },
      { status: 500 },
    );
  }
}
