import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { citedSources } from "@/lib/citations";
import { env } from "@/lib/env";
import { n8nFetch, relayJson } from "@/lib/n8n";
import type { ChatStreamEvent, Source } from "@/lib/types";

export const maxDuration = 60;

/**
 * 1. n8n busca en el manual elegido y devuelve la petición a Claude ya montada.
 * 2. Aquí se envía a Claude en streaming y el texto se reenvía al navegador
 *    como NDJSON (un ChatStreamEvent por línea).
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const manualId = typeof body?.manual_id === "string" ? body.manual_id : "";
  if (!question) return NextResponse.json({ error: "Escribe una pregunta" }, { status: 400 });
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(manualId)) {
    return NextResponse.json({ error: "Selecciona un manual" }, { status: 400 });
  }

  const retrieval = await n8nFetch("retrieve", {
    method: "POST",
    body: JSON.stringify({
      question,
      manual_id: manualId,
      history: Array.isArray(body.history) ? body.history : [],
    }),
  });
  if (!retrieval.ok) return relayJson(retrieval);
  const { body: params, hits } = (await retrieval.json()) as {
    body: Anthropic.MessageStreamParams;
    hits: Source[];
  };

  const client = new Anthropic({ apiKey: env.anthropicApiKey() });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const claude = client.messages.stream(params, { signal: request.signal });
        for await (const event of claude) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ type: "text", text: event.delta.text });
          }
        }
        const final = await claude.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "error", error: "No puedo responder a esta consulta. Prueba a formularla de otra manera." });
          return;
        }
        const answer = final.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");
        send({ type: "done", sources: citedSources(answer, hits), truncated: final.stop_reason === "max_tokens" });
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("Claude stream", error);
          send({ type: "error", error: "Error generando la respuesta. Inténtalo de nuevo." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
