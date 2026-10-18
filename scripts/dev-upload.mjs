// Reproduce la subida que hace UploadForm.tsx (necesita una cookie de admin de dev-login-cookie.mjs).
// Uso (desde frontend/): node --env-file=.env.local scripts/dev-upload.mjs <fichero-cookie> <manual.pdf|docx> <título> [categoría]
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [cookieFile, file, title, category = ""] = process.argv.slice(2);
const cookie = readFileSync(cookieFile, "utf8").trim();
const base = process.env.APP_URL ?? "http://localhost:3000";
const data = readFileSync(file);
const filename = basename(file);
const mime = filename.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";

const post = async (path, body) => {
  const r = await fetch(base + path, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j)}`);
  return j;
};

const target = await post("/api/manuals/upload-url", { filename, size: data.length });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const { error } = await supabase.storage.from("manuals").uploadToSignedUrl(target.path, target.token, new Blob([data], { type: mime }), { contentType: mime });
if (error) throw error;
console.log(JSON.stringify(await post("/api/manuals", { manual_id: target.manual_id, path: target.path, filename, title, category })));
