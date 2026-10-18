"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, ChatStreamEvent, Manual, Source } from "@/lib/types";
import PageViewer from "./PageViewer";

const HISTORY_MESSAGES = 6;
const LAST_MANUAL_KEY = "last-manual";

/** Lee un stream NDJSON y llama a onEvent por cada línea completa. */
async function readStream(res: Response, onEvent: (event: ChatStreamEvent) => void) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer));
}

export default function Chat() {
  const [manuals, setManuals] = useState<Manual[] | null>(null);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "streaming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Source | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/manuals")
      .then((r) => (r.ok ? r.json() : { manuals: [] }))
      .then((d) => {
        const ready = (d.manuals as Manual[]).filter((m) => m.status === "ready");
        setManuals(ready);
        let last: string | null = null;
        try {
          last = localStorage.getItem(LAST_MANUAL_KEY);
        } catch {}
        if (last && ready.some((m) => m.manual_id === last)) setSelected(last);
        else if (ready.length === 1) setSelected(ready[0].manual_id);
      })
      .catch(() => setManuals([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function selectManual(id: string) {
    // La conversación es sobre un manual: al cambiarlo se empieza de cero
    abortRef.current?.abort();
    setSelected(id);
    setMessages([]);
    setError(null);
    try {
      localStorage.setItem(LAST_MANUAL_KEY, id);
    } catch {}
    inputRef.current?.focus();
  }

  function updateLast(patch: (m: ChatMessage) => ChatMessage) {
    setMessages((msgs) => [...msgs.slice(0, -1), patch(msgs[msgs.length - 1])]);
  }

  async function send() {
    const question = input.trim();
    if (!question || !selected || status !== "idle") return;
    const history = messages
      .filter((m) => !m.error && m.content)
      .slice(-HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setError(null);
    setStatus("searching");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, manual_id: selected }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al consultar");
      }
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      setStatus("streaming");
      await readStream(res, (event) => {
        if (event.type === "text") updateLast((m) => ({ ...m, content: m.content + event.text }));
        else if (event.type === "done") updateLast((m) => ({ ...m, sources: event.sources, truncated: event.truncated }));
        else updateLast((m) => ({ ...m, error: event.error }));
      });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Error al consultar");
      // Si no llegó a empezar la respuesta, devuelve la pregunta al cuadro de texto
      setMessages((m) => (m[m.length - 1]?.role === "user" ? m.slice(0, -1) : m));
      setInput(question);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStatus("idle");
    }
  }

  function stop() {
    abortRef.current?.abort();
    updateLast((m) => (m.role === "assistant" ? { ...m, truncated: true } : m));
    setStatus("idle");
  }

  const current = manuals?.find((m) => m.manual_id === selected);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-fg-muted" htmlFor="manual">
          Manual:
        </label>
        <select
          id="manual"
          value={selected}
          onChange={(e) => selectManual(e.target.value)}
          disabled={!manuals?.length}
          className="min-w-0 max-w-full flex-1 rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm sm:flex-none"
        >
          <option value="" disabled>
            {manuals === null ? "Cargando…" : manuals.length ? "Elige un manual…" : "No hay manuales disponibles"}
          </option>
          {manuals?.map((m) => (
            <option key={m.manual_id} value={m.manual_id}>
              {m.title}
              {m.category ? ` · ${m.category}` : ""}
            </option>
          ))}
        </select>
        {messages.length > 0 && (
          <button onClick={() => selectManual(selected)} className="ml-auto text-sm text-fg-subtle hover:text-fg">
            Nueva conversación
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-fg-subtle">
            {current ? (
              <>
                <p className="font-medium text-fg">Pregunta sobre «{current.title}»</p>
                <p className="mt-1 text-sm">
                  Las respuestas salen solo de este manual y citan la página de donde provienen.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-fg">Elige un manual para empezar</p>
                <p className="mt-1 text-sm">Cada consulta se responde únicamente con el manual seleccionado.</p>
              </>
            )}
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-xl bg-accent px-4 py-2.5 text-white">
                {m.content}
              </div>
            );
          }
          const isStreaming = status === "streaming" && i === messages.length - 1;
          return (
            <div key={i} className="max-w-[95%] rounded-xl border border-border bg-surface px-4 py-3">
              <div className={`markdown text-[15px] leading-relaxed ${isStreaming ? "streaming-cursor" : ""}`}>
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
              {m.error && <p className="mt-2 text-sm text-danger">{m.error}</p>}
              {m.truncated && !m.error && <p className="mt-2 text-xs text-fg-subtle">(Respuesta interrumpida)</p>}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-fg-subtle">Fuentes:</span>
                  {m.sources.map((s) => (
                    <button
                      key={`${s.manual_id}-${s.page}`}
                      onClick={() => setViewing(s)}
                      className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs text-fg hover:border-accent hover:bg-accent-soft"
                      title="Ver página"
                    >
                      p. {s.page}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {status === "searching" && <div className="text-sm text-fg-subtle">Buscando en el manual…</div>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="sticky bottom-0 flex gap-2 bg-bg py-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          maxLength={2000}
          disabled={!selected}
          placeholder={
            selected
              ? "Escribe tu pregunta… (Enter para enviar, Shift+Enter para salto de línea)"
              : "Primero elige un manual"
          }
          className="min-w-0 flex-1 resize-none rounded-lg border border-border-strong bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
        />
        {status === "streaming" ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-border-strong px-4 font-medium hover:bg-surface-muted"
          >
            Detener
          </button>
        ) : (
          <button
            type="submit"
            disabled={status !== "idle" || !selected || !input.trim()}
            className="rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Enviar
          </button>
        )}
      </form>

      {viewing && <PageViewer source={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
