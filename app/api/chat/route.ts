import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, NO_SOURCE_NOTE } from "@/lib/system-prompt";
import { loadKnowledgeSource } from "@/lib/knowledge";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 4096;

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === "user" || v.role === "assistant") &&
    typeof v.content === "string" &&
    v.content.trim().length > 0
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(rawMessages) || !rawMessages.every(isChatMessage)) {
    return Response.json(
      { error: "Body must be { messages: { role, content }[] }." },
      { status: 400 }
    );
  }
  const history = rawMessages as ChatMessage[];
  if (history.length === 0) {
    return Response.json({ error: "messages cannot be empty." }, { status: 400 });
  }

  const knowledge = loadKnowledgeSource();
  const anthropic = new Anthropic({ apiKey });

  const messages: MessageParam[] = history.map((m, i) => {
    if (i === 0 && m.role === "user" && knowledge.available && knowledge.base64) {
      const content: ContentBlockParam[] = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: knowledge.base64,
          },
          title: "$100M Leads",
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: m.content },
      ];
      return { role: "user", content };
    }
    return { role: m.role, content: m.content };
  });

  const system = knowledge.available
    ? SYSTEM_PROMPT
    : SYSTEM_PROMPT + NO_SOURCE_NOTE;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            { type: "text", text: system, cache_control: { type: "ephemeral" } },
          ],
          messages,
        });

        anthropicStream.on("text", (delta: string) => {
          controller.enqueue(encoder.encode(delta));
        });

        await anthropicStream.finalMessage();
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error calling the model.";
        controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
