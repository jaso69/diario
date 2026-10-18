export type ManualStatus = "processing" | "ready" | "error";

export interface Manual {
  manual_id: string;
  title: string;
  category: string;
  filename: string;
  status: ManualStatus;
  page_count: number | null;
  chunk_count: number | null;
  error: string | null;
  created_at: string;
}

export interface Source {
  manual_id: string;
  title: string;
  page: number;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: string;
  truncated?: boolean;
}

/** Líneas del stream de /api/chat (NDJSON). */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; sources: Source[]; truncated: boolean }
  | { type: "error"; error: string };

export const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "odt"];
// Debe coincidir con el límite del bucket de Supabase (el plan gratuito permite 50 MB como máximo).
// Se fija al compilar: en Vercel, NEXT_PUBLIC_MAX_UPLOAD_MB=50.
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 200;

export type UserRole = "admin" | "user";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  status: "invited" | "active";
  invited_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}
