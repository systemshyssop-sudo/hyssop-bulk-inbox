type Message = {
  id: string;
  phone_number: string;
  message_text: string;
  direction: "incoming" | "outgoing";
  status: string;
  created_at: string;
  is_read?: boolean;
};

export function groupMessagesByPhone(messages: Message[]) {
  const grouped: Record<string, Message[]> = {};

  for (const msg of messages) {
    const phone = msg.phone_number?.trim();
    if (!phone) continue;

    if (!grouped[phone]) {
      grouped[phone] = [];
    }

    grouped[phone].push(msg);
  }

  for (const phone in grouped) {
    grouped[phone].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );
  }

  return grouped;
}