"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getMessages } from "@/lib/messages/queries";
import { groupMessagesByPhone } from "@/lib/messages/groupMessages";
import { supabase } from "@/lib/supabase/client";

type Message = {
  id: string;
  phone_number: string;
  message_text: string;
  direction: "incoming" | "outgoing";
  status: string;
  created_at: string;
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load messages
  useEffect(() => {
    const load = async () => {
      const data = await getMessages();
      setMessages(data);
    };
    load();
  }, []);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async () => {
          const data = await getMessages();
          setMessages(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const conversations = useMemo(() => {
    return groupMessagesByPhone(messages);
  }, [messages]);

  // SORT CHATS BY LATEST MESSAGE (WHATSAPP STYLE)
  const sortedPhones = useMemo(() => {
    return Object.keys(conversations).sort((a, b) => {
      const aLast =
        conversations[a]?.[conversations[a].length - 1]?.created_at || 0;
      const bLast =
        conversations[b]?.[conversations[b].length - 1]?.created_at || 0;

      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });
  }, [conversations]);

  // ACTIVE CHAT
  const activeMessages: Message[] = useMemo(() => {
    if (!selectedPhone) return [];

    return [...(conversations[selectedPhone] || [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );
  }, [selectedPhone, conversations]);

  // UNREAD COUNTER LOGIC (disappears when opened)
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    Object.keys(conversations).forEach((phone) => {
      if (phone === selectedPhone) return;

      counts[phone] = conversations[phone].filter(
        (m: Message) => m.direction === "incoming"
      ).length;
    });

    return counts;
  }, [conversations, selectedPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPhone, activeMessages.length]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Arial",
        background: "#0b1220",
        color: "white",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: "30%",
          borderRight: "1px solid #334155",
          background: "#0b1220",
          overflowY: "auto",
        }}
      >
        <div
  style={{
    padding: 16,
    borderBottom: "1px solid #334155",
  }}
>
  <div style={{ fontSize: 16, fontWeight: 700 }}>
    Hyssop Bulk Inbox
  </div>

  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
    WhatsApp messaging console
  </div>
</div>

        {sortedPhones.map((phone) => {
          const lastMsg =
            conversations[phone]?.[conversations[phone].length - 1];

          const unread = unreadCounts[phone] || 0;

          return (
            <div
              key={phone}
              onClick={() => setSelectedPhone(phone)}
              style={{
                padding: 12,
                cursor: "pointer",
                borderBottom: "1px solid #1f2937",
                background:
                  selectedPhone === phone ? "#1e293b" : "transparent",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontWeight: 600, color: "#f9fafb" }}>
                  {phone}
                </div>

                {unread > 0 && (
                  <div
                    style={{
                      background: "#ef4444",
                      color: "white",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 12,
                    }}
                  >
                    {unread}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {lastMsg?.message_text || "No messages"}
              </div>
            </div>
          );
        })}
      </div>

      {/* CHAT AREA */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#0b1220",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #334155",
            background: "#0b1220",
            fontWeight: "bold",
          }}
        >
          {selectedPhone ? `Chat: ${selectedPhone}` : "Hyssop Bulk Inbox"}
        </div>

        {/* MESSAGES */}
        <div
          style={{
            flex: 1,
            padding: 16,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {!selectedPhone && (
            <div style={{ color: "#64748b" }}>
              Choose a conversation to start
            </div>
          )}

          {activeMessages.map((msg) => {
            const isIncoming = msg.direction === "incoming";

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: isIncoming
                    ? "flex-start"
                    : "flex-end",
                }}
              >
                <div
                  style={{
                    background: isIncoming ? "#1f2937" : "#2563eb",
                    color: "white",
                    padding: "10px 12px",
                    borderRadius: 12,
                    maxWidth: "60%",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.message_text}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div
          style={{
            display: "flex",
            padding: 12,
            borderTop: "1px solid #334155",
            background: "#0b1220",
          }}
        >
          <input
            id="msgInput"
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "white",
            }}
          />

          <button
            style={{
              marginLeft: 10,
              padding: "10px 16px",
              background: "#2563eb",
              color: "white",
              borderRadius: 8,
              border: "none",
            }}
            onClick={async () => {
              const input = document.getElementById(
                "msgInput"
              ) as HTMLInputElement;

              const text = input.value;

              if (!text || !selectedPhone) return;

              await fetch(
                "https://gupshupapi.app.n8n.cloud/webhook/send-message",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    phone: selectedPhone,
                    message: text,
                  }),
                }
              );

              input.value = "";
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}