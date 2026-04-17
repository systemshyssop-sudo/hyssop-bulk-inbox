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

  // LOAD
  useEffect(() => {
    const load = async () => {
      const data = await getMessages();
      setMessages(data || []);
    };
    load();
  }, []);

  // REALTIME
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async () => {
          const data = await getMessages();
          setMessages(data || []);
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

  const sortedPhones = useMemo(() => {
    return Object.keys(conversations).sort((a, b) => {
      const aLast = conversations[a]?.at(-1)?.created_at || 0;
      const bLast = conversations[b]?.at(-1)?.created_at || 0;
      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });
  }, [conversations]);

  const activeMessages = useMemo(() => {
    if (!selectedPhone) return [];
    return [...(conversations[selectedPhone] || [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [selectedPhone, conversations]);

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    Object.keys(conversations).forEach((phone) => {
      if (phone === selectedPhone) return;
      counts[phone] = conversations[phone].filter(
        (m) => m.direction === "incoming"
      ).length;
    });

    return counts;
  }, [conversations, selectedPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPhone, activeMessages.length]);

  return (
    <div className="container" style={{
      display: "flex",
      height: "100vh",
      fontFamily: "Arial",
      background: "#0f172a",
      color: "white",
    }}>

      {/* SIDEBAR */}
      <div className="sidebar" style={{
        width: "30%",
        minWidth: 280,
        maxWidth: 360,
        borderRight: "1px solid #334155",
        background: "#111827",
        overflowY: "auto",
      }}>

        <div style={{ padding: 16, borderBottom: "1px solid #334155" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Hyssop Bulk Inbox
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            WhatsApp console
          </div>
        </div>

        {sortedPhones.map((phone) => {
          const lastMsg = conversations[phone]?.at(-1);
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
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>{phone}</div>
                {unread > 0 && (
                  <div style={{
                    background: "#ef4444",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 12,
                  }}>
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

      {/* CHAT */}
      <div className="chat-area" style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#0b1220",
        minWidth: 0,
      }}>

        {/* HEADER */}
        <div style={{
          padding: 16,
          borderBottom: "1px solid #334155",
          fontWeight: "bold",
        }}>
          {selectedPhone || "Hyssop Bulk Inbox"}
        </div>

        {/* MESSAGES */}
        <div style={{
          flex: 1,
          padding: 16,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          {!selectedPhone && (
            <div style={{ color: "#64748b" }}>
              Select a chat
            </div>
          )}

          {activeMessages.map((msg) => {
            const isIncoming = msg.direction === "incoming";

            return (
              <div key={msg.id} style={{
                display: "flex",
                justifyContent: isIncoming ? "flex-start" : "flex-end",
              }}>
                <div style={{
                  background: isIncoming ? "#1f2937" : "#2563eb",
                  padding: "10px 12px",
                  borderRadius: 12,
                  maxWidth: "60%",
                  wordBreak: "break-word",
                }}>
                  {msg.message_text}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div style={{
          display: "flex",
          padding: 12,
          borderTop: "1px solid #334155",
        }}>
          <input
            id="msgInput"
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              background: "#0f172a",
              color: "white",
              border: "1px solid #334155",
            }}
          />

          <button
            style={{
              marginLeft: 10,
              padding: "10px 16px",
              background: "#2563eb",
              borderRadius: 8,
              border: "none",
              color: "white",
            }}
            onClick={async () => {
              const input = document.getElementById("msgInput") as HTMLInputElement;
              const text = input.value;

              if (!text || !selectedPhone) return;

              await fetch(
                "https://gupshupapi.app.n8n.cloud/webhook/send-message",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
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

      {/* MOBILE FIX */}
      <style>{`
        @media (max-width: 768px) {
          .container {
            flex-direction: column !important;
          }

          .sidebar {
            width: 100% !important;
            max-width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #334155;
            height: 40vh;
          }

          .chat-area {
            height: 60vh;
          }
        }
      `}</style>
    </div>
  );
}