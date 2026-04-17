export function groupMessagesByPhone(messages: any[]) {
  const grouped: Record<string, any[]> = {};

  for (const msg of messages) {
    const phone = msg.phone_number?.trim();
    if (!phone) continue;

    if (!grouped[phone]) {
      grouped[phone] = [];
    }

    grouped[phone].push(msg);
  }

  // ✅ IMPORTANT: sort each conversation by time
  for (const phone in grouped) {
    grouped[phone].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );
  }

  return grouped;
}