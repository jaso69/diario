import type { User } from "@supabase/supabase-js";
import type { AppUser, UserRole } from "@/lib/types";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRole(value: unknown): value is UserRole {
  return value === "admin" || value === "user";
}

export function toAppUser(u: User): AppUser {
  return {
    id: u.id,
    email: u.email ?? "",
    role: u.app_metadata?.role === "admin" ? "admin" : "user",
    // Un invitado no tiene el email confirmado hasta que abre el enlace
    status: u.email_confirmed_at ? "active" : "invited",
    invited_at: u.invited_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    created_at: u.created_at,
  };
}
