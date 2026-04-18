import { supabase } from "@/lib/supabase/browser";

export async function getMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, phone_number, message_text, direction, status, created_at, is_read"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getMessages error:", error);
    return [];
  }

  return data ?? [];
}

export async function getContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select("phone_number, name");

  if (error) {
    console.error("Supabase getContacts error:", error);
    return [];
  }

  return data ?? [];
}