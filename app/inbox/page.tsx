"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMessages, getContacts } from "@/lib/messages/queries";
import { groupMessagesByPhone } from "@/lib/messages/groupMessages";
import { supabase } from "@/lib/supabase/browser";

type Message = {
  id: string;
  phone_number: string;
  message_text: string;
  direction: "incoming" | "outgoing";
  status: string;
  created_at: string;
  is_read?: boolean;
};

type Contact = {
  phone_number: string;
  name: string | null;
};

type FilterType = "all" | "unread" | "expired";

function formatTime(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDay(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return formatDate(dateString);
}

function isConversationExpired(messages: Message[]) {
  const latestInbound = [...messages]
    .filter((m) => m.direction === "incoming")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

  if (!latestInbound) return true;

  const lastInboundTime = new Date(latestInbound.created_at).getTime();
  const now = Date.now();
  const hours24 = 24 * 60 * 60 * 1000;

  return now - lastInboundTime > hours24;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  );

  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function refreshMessages() {
    const [messagesData, contactsData] = await Promise.all([
      getMessages(),
      getContacts(),
    ]);

    setMessages(messagesData || []);
    setContacts(contactsData || []);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await refreshMessages();
      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async () => {
          await refreshMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const conversations = useMemo(() => {
    return groupMessagesByPhone(
      messages.filter((m) => m.phone_number?.trim() && m.message_text?.trim())
    );
  }, [messages]);

  const contactMap = useMemo(() => {
    const map: Record<string, string> = {};

    contacts.forEach((contact) => {
      if (contact.phone_number?.trim() && contact.name?.trim()) {
        map[contact.phone_number.trim()] = contact.name.trim();
      }
    });

    return map;
  }, [contacts]);

  const conversationMeta = useMemo(() => {
    return Object.keys(conversations).map((phone) => {
      const convo = conversations[phone] || [];
      const lastMsg = convo.at(-1);
      const expired = isConversationExpired(convo);
      const unreadCount = convo.filter(
        (m) => m.direction === "incoming" && !m.is_read
      ).length;

      return {
        phone,
        convo,
        lastMsg,
        expired,
        unreadCount,
        displayName: contactMap[phone] || phone,
      };
    });
  }, [conversations, contactMap]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return conversationMeta
      .filter(({ phone, displayName, lastMsg, unreadCount, expired }) => {
        const matchesSearch =
          !term ||
          phone.toLowerCase().includes(term) ||
          displayName.toLowerCase().includes(term) ||
          (lastMsg?.message_text || "").toLowerCase().includes(term);

        if (!matchesSearch) return false;

        if (filter === "unread") return unreadCount > 0;
        if (filter === "expired") return expired;

        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(a.lastMsg?.created_at || 0).getTime();
        const bTime = new Date(b.lastMsg?.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [conversationMeta, filter, search]);

  useEffect(() => {
    const allPhones = conversationMeta.map((c) => c.phone);

    if (!selectedPhone && filter === "all" && allPhones.length > 0) {
      setSelectedPhone(allPhones[0]);
      return;
    }

    if (selectedPhone && !allPhones.includes(selectedPhone)) {
      setSelectedPhone(allPhones[0] || null);
      setMobileChatOpen(false);
    }
  }, [conversationMeta, selectedPhone, filter]);

  const activeMessages = useMemo(() => {
    if (!selectedPhone) return [];
    return [...(conversations[selectedPhone] || [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [selectedPhone, conversations]);

  const activeConversationExpired = useMemo(() => {
    if (!selectedPhone) return true;
    return isConversationExpired(conversations[selectedPhone] || []);
  }, [selectedPhone, conversations]);

  const activeDisplayName = selectedPhone
    ? contactMap[selectedPhone] || selectedPhone
    : "Select a conversation";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPhone, activeMessages.length]);

  useEffect(() => {
    if (!selectedPhone) return;

    const unreadIncoming = (conversations[selectedPhone] || []).filter(
      (m) => m.direction === "incoming" && !m.is_read
    );

    if (unreadIncoming.length === 0) return;

    const unreadIds = unreadIncoming.map((m) => m.id);

    setMessages((prev) =>
      prev.map((msg) =>
        unreadIds.includes(msg.id) ? { ...msg, is_read: true } : msg
      )
    );

    supabase
      .from("messages")
      .update({ is_read: true })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to mark messages as read:", error);
          refreshMessages();
        }
      });
  }, [selectedPhone, conversations]);

  async function handleSend() {
    if (!selectedPhone || !draft.trim() || isSending || activeConversationExpired) {
      return;
    }

    const messageText = draft.trim();

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      phone_number: selectedPhone,
      message_text: messageText,
      direction: "outgoing",
      status: "sending",
      created_at: new Date().toISOString(),
      is_read: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setDraft("");
    setIsSending(true);
    setSendError("");

    try {
      const res = await fetch(
        "https://hyssop.app.n8n.cloud/webhook/send-message",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: selectedPhone,
            message: messageText,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to send");
      }

      await refreshMessages();
    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setDraft(messageText);
      setSendError("Message failed to send.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;

    setDeletingMessageId(messageId);

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error(error);
      alert("Failed to delete message.");
    } finally {
      setDeletingMessageId(null);
    }
  }

  async function handleDeleteConversation() {
    if (!selectedPhone) return;

    const confirmed = window.confirm(
      `Delete the entire conversation for ${activeDisplayName}?`
    );
    if (!confirmed) return;

    setDeletingConversation(true);

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("phone_number", selectedPhone);

      if (error) throw error;

      setMessages((prev) =>
        prev.filter((m) => m.phone_number !== selectedPhone)
      );
      setSelectedPhone(null);
      setMobileChatOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to delete conversation.");
    } finally {
      setDeletingConversation(false);
    }
  }

  function openChat(phone: string) {
    setSelectedPhone(phone);
    setMobileChatOpen(true);
  }

  function closeMobileChat() {
    setMobileChatOpen(false);
  }

  const sidebar = (
    <aside className="flex h-full w-full flex-col bg-slate-950">
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="text-xl font-semibold tracking-tight text-white">
          Hyssop Bulk Inbox
        </div>
        <div className="mt-1 text-sm text-slate-400">
          WhatsApp conversations
        </div>

        <button
          onClick={handleSignOut}
          className="mt-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        >
          Sign out
        </button>

        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-500"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === "all"
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === "unread"
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === "expired"
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            Expired
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-slate-400">Loading chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">No conversations found.</div>
        ) : (
          filteredConversations.map(
            ({ phone, displayName, lastMsg, unreadCount, expired }) => {
              const active = selectedPhone === phone;
              const hasSavedName = displayName !== phone;

              return (
                <button
                  key={phone}
                  onClick={() => openChat(phone)}
                  className={`flex w-full items-start gap-3 border-b border-slate-800 px-4 py-4 text-left transition ${
                    active ? "bg-slate-900" : "hover:bg-slate-900/70"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300">
                    WA
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">
                          {displayName}
                        </div>
                        {hasSavedName && (
                          <div className="truncate text-xs text-slate-500">
                            {phone}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-xs text-slate-500">
                        {formatTime(lastMsg?.created_at)}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="truncate text-sm text-slate-400">
                        {lastMsg?.message_text || "No messages"}
                      </div>

                      <div className="flex items-center gap-2">
                        {expired && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300">
                            Expired
                          </span>
                        )}
                        {unreadCount > 0 && selectedPhone !== phone && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-slate-950">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            }
          )
        )}
      </div>
    </aside>
  );

  const chatPanel = (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={closeMobileChat}
            className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300 md:hidden"
          >
            Back
          </button>

          <div>
            <div className="font-semibold text-white">{activeDisplayName}</div>
            {selectedPhone && contactMap[selectedPhone] && (
              <div className="mt-1 text-xs text-slate-500">{selectedPhone}</div>
            )}
            {selectedPhone && (
              <div className="mt-1 text-xs text-slate-400">
                {activeConversationExpired
                  ? "Expired: cannot reply until customer messages again"
                  : "Active: reply window open"}
              </div>
            )}
          </div>
        </div>

        {selectedPhone && (
          <button
            onClick={handleDeleteConversation}
            disabled={deletingConversation}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
          >
            {deletingConversation ? "Deleting..." : "Delete chat"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_100%)] px-4 py-4 md:px-6 md:py-6">
        {!selectedPhone ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            Select a chat to view messages.
          </div>
        ) : activeMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            No messages in this conversation.
          </div>
        ) : (
          <div className="space-y-3">
            {activeMessages.map((msg, index) => {
              const isIncoming = msg.direction === "incoming";
              const previousMessage = activeMessages[index - 1];

              const showDayLabel =
                !previousMessage ||
                formatRelativeDay(previousMessage.created_at) !==
                  formatRelativeDay(msg.created_at);

              return (
                <div key={msg.id}>
                  {showDayLabel && (
                    <div className="mb-3 flex justify-center">
                      <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                        {formatRelativeDay(msg.created_at)}
                      </div>
                    </div>
                  )}

                  <div
                    className={`group flex ${
                      isIncoming ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-lg md:max-w-[70%] ${
                        isIncoming
                          ? "rounded-bl-md bg-slate-800 text-white"
                          : "rounded-br-md bg-emerald-500 text-slate-950"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm leading-6">
                        {msg.message_text}
                      </div>

                      <div
                        className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${
                          isIncoming ? "text-slate-400" : "text-slate-900/70"
                        }`}
                      >
                        <span>{formatTime(msg.created_at)}</span>
                        {!isIncoming && msg.status && <span>• {msg.status}</span>}

                        {!String(msg.id).startsWith("temp-") && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            className={`rounded px-1.5 py-0.5 ${
                              isIncoming
                                ? "bg-slate-700 text-slate-300"
                                : "bg-emerald-600/30 text-slate-900"
                            }`}
                          >
                            {deletingMessageId === msg.id ? "..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 bg-slate-950 p-4">
        {sendError && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {sendError}
          </div>
        )}

        {selectedPhone && activeConversationExpired && (
          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            This chat is expired. You can only reply after the customer sends a new
            message.
          </div>
        )}

        <div className="flex items-end gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              !selectedPhone
                ? "Select a chat first..."
                : activeConversationExpired
                ? "Reply window expired"
                : "Type a message..."
            }
            disabled={!selectedPhone || isSending || activeConversationExpired}
            rows={1}
            className="max-h-40 min-h-[48px] flex-1 resize-y rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            onClick={handleSend}
            disabled={
              !selectedPhone ||
              !draft.trim() ||
              isSending ||
              activeConversationExpired
            }
            className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <div className="h-screen bg-slate-950 text-white">
      <div className="mx-auto h-full max-w-[1600px] overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="hidden h-full md:flex">
          <div className="w-[380px] border-r border-slate-800">{sidebar}</div>
          {chatPanel}
        </div>

        <div className="h-full md:hidden">
          {!mobileChatOpen ? sidebar : chatPanel}
        </div>
      </div>
    </div>
  );
}