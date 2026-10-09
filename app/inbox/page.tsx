"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Inbox as InboxIcon,
  Megaphone,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Settings,
  Smile,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { groupMessagesByPhone } from "@/lib/messages/groupMessages";
import { getContacts, getMessages } from "@/lib/messages/queries";
import { supabase } from "@/lib/supabase/browser";

type Message = {
  id: string;
  phone_number: string;
  message_text: string | null;
  direction: "incoming" | "outgoing";
  status: string;
  message_id?: string | null;
  created_at: string;
  is_read: boolean | null;
  media_url?: string | null;
  media_type?: string | null;
  media_name?: string | null;
  media_mime_type?: string | null;
  media_size_bytes?: number | null;
  thumbnail_url?: string | null;
  caption?: string | null;
};

type Contact = {
  phone_number: string;
  name: string | null;
};

type FilterType = "all" | "unread" | "expired";
type OutgoingMediaType = "image" | "file";

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

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return formatDate(dateString);
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isConversationExpired(messages: Message[]) {
  const latestInbound = [...messages]
    .filter((message) => message.direction === "incoming")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )[0];

  if (!latestInbound) return true;

  const lastInboundTime = new Date(
    latestInbound.created_at
  ).getTime();

  const hours24 = 24 * 60 * 60 * 1000;

  return Date.now() - lastInboundTime > hours24;
}

function getMessagePreview(message?: Message) {
  if (!message) return "No messages";

  const text =
    message.caption?.trim() ||
    message.message_text?.trim();

  if (text) return text;

  if (message.media_type === "image") {
    return "Photo";
  }

  if (message.media_type === "video") {
    return "Video";
  }

  if (message.media_type === "audio") {
    return "Audio";
  }

  if (message.media_url) {
    return message.media_name || "Attachment";
  }

  return "No message content";
}

const navigation = [
  {
    href: "/inbox",
    label: "Inbox",
    icon: InboxIcon,
  },
  {
    href: "/inbox/contacts",
    label: "Contacts",
    icon: Users,
  },
  {
    href: "/inbox/campaigns",
    label: "Campaigns",
    icon: Megaphone,
  },
  {
    href: "/inbox/templates",
    label: "Templates",
    icon: FileText,
  },
  {
    href: "/inbox/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    null
  );
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showConversationMenu, setShowConversationMenu] =
    useState(false);
  const [deletingConversation, setDeletingConversation] =
    useState(false);
  const [deletingMessageId, setDeletingMessageId] =
    useState<string | null>(null);

  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshMessages() {
    const [messagesData, contactsData] = await Promise.all([
      getMessages(),
      getContacts(),
    ]);

    setMessages(messagesData);
    setContacts(contactsData);
  }

  async function uploadAttachment(file: File, phone: string) {
    const extension = file.name.split(".").pop() || "file";

    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 60);

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}-${safeName}.${extension}`;

    const safePhone = phone.replace(/[^0-9]/g, "");
    const filePath = `${safePhone}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Attachment upload error:", uploadError);
      throw new Error("Attachment upload failed.");
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from("whatsapp-media")
      .createSignedUrl(filePath, 60 * 60 * 24);

    if (signedUrlError || !data?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      throw new Error("Could not generate an attachment URL.");
    }

    return data.signedUrl;
  }
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        await refreshMessages();
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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
        () => {
          void refreshMessages();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const conversations = useMemo(() => {
    const visibleMessages = messages.filter((message) => {
      const hasPhone = Boolean(message.phone_number?.trim());

      const hasContent = Boolean(
        message.message_text?.trim() ||
          message.caption?.trim() ||
          message.media_url?.trim()
      );

      return hasPhone && hasContent;
    });

    return groupMessagesByPhone(visibleMessages);
  }, [messages]);

  const contactMap = useMemo(() => {
    const map: Record<string, string> = {};

    contacts.forEach((contact) => {
      const phone = contact.phone_number?.trim();
      const name = contact.name?.trim();

      if (phone && name) {
        map[phone] = name;
      }
    });

    return map;
  }, [contacts]);

  const conversationMeta = useMemo(() => {
    return Object.keys(conversations).map((phone) => {
      const conversation = conversations[phone] || [];
      const lastMessage = conversation.at(-1);
      const expired = isConversationExpired(conversation);

      const unreadCount = conversation.filter(
        (message) =>
          message.direction === "incoming" && !message.is_read
      ).length;

      return {
        phone,
        conversation,
        lastMessage,
        expired,
        unreadCount,
        displayName: contactMap[phone] || phone,
      };
    });
  }, [conversations, contactMap]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return conversationMeta
      .filter(
        ({
          phone,
          displayName,
          lastMessage,
          unreadCount,
          expired,
        }) => {
          const preview =
            getMessagePreview(lastMessage).toLowerCase();

          const matchesSearch =
            !term ||
            phone.toLowerCase().includes(term) ||
            displayName.toLowerCase().includes(term) ||
            preview.includes(term);

          if (!matchesSearch) return false;

          if (filter === "unread") {
            return unreadCount > 0;
          }

          if (filter === "expired") {
            return expired;
          }

          return true;
        }
      )
      .sort((a, b) => {
        const aTime = new Date(
          a.lastMessage?.created_at || 0
        ).getTime();

        const bTime = new Date(
          b.lastMessage?.created_at || 0
        ).getTime();

        return bTime - aTime;
      });
  }, [conversationMeta, filter, search]);

  useEffect(() => {
    const allPhones = conversationMeta.map(
      (conversation) => conversation.phone
    );

    const timeout = window.setTimeout(() => {
      if (
        !selectedPhone &&
        filter === "all" &&
        allPhones.length > 0
      ) {
        setSelectedPhone(allPhones[0]);
        return;
      }

      if (
        selectedPhone &&
        !allPhones.includes(selectedPhone)
      ) {
        setSelectedPhone(allPhones[0] || null);
        setMobileChatOpen(false);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [conversationMeta, selectedPhone, filter]);

  const activeMessages = useMemo(() => {
    if (!selectedPhone) return [];

    return [...(conversations[selectedPhone] || [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );
  }, [selectedPhone, conversations]);

  const activeConversationExpired = useMemo(() => {
    if (!selectedPhone) return true;

    return isConversationExpired(
      conversations[selectedPhone] || []
    );
  }, [selectedPhone, conversations]);

  const activeDisplayName = selectedPhone
    ? contactMap[selectedPhone] || selectedPhone
    : "Select a conversation";

  useEffect(() => {
    if (!selectedPhone) return;

    const timeout = window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [selectedPhone, activeMessages.length, mobileChatOpen]);

  useEffect(() => {
    if (!selectedPhone) return;

    const unreadIncoming = (
      conversations[selectedPhone] || []
    ).filter(
      (message) =>
        message.direction === "incoming" && !message.is_read
    );

    if (unreadIncoming.length === 0) return;

    const unreadIds = unreadIncoming.map(
      (message) => message.id
    );

    void supabase
      .from("messages")
      .update({ is_read: true })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) {
          console.error(
            "Failed to mark messages as read:",
            error
          );

          void refreshMessages();
          return;
        }

        setMessages((previousMessages) =>
          previousMessages.map((message) =>
            unreadIds.includes(message.id)
              ? {
                  ...message,
                  is_read: true,
                }
              : message
          )
        );
      });
  }, [selectedPhone, conversations]);

  function handleAttachmentChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setSendError(
        "Only JPG, PNG, WEBP and PDF files are currently supported."
      );

      event.target.value = "";
      return;
    }

    const maxSizeMb = 25;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setSendError(
        `Attachment must be ${maxSizeMb} MB or smaller.`
      );

      event.target.value = "";
      return;
    }

    setAttachment(file);
    setSendError("");
  }

  async function handleSend() {
    if (
      !selectedPhone ||
      (!draft.trim() && !attachment) ||
      isSending ||
      activeConversationExpired
    ) {
      return;
    }

    const originalDraft = draft;
    const originalAttachment = attachment;
    const messageText = draft.trim();

    let mediaUrl: string | null = null;
    let mediaType: OutgoingMediaType | null = null;

    if (originalAttachment) {
      try {
        mediaUrl = await uploadAttachment(
          originalAttachment,
          selectedPhone
        );

        mediaType = originalAttachment.type.startsWith("image/")
          ? "image"
          : "file";
      } catch (error) {
        console.error(error);
        setSendError("Failed to upload attachment.");
        return;
      }
    }

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      phone_number: selectedPhone,
      message_text: messageText || null,
      direction: "outgoing",
      status: "sending",
      created_at: new Date().toISOString(),
      is_read: true,
      media_url: mediaUrl,
      media_type: mediaType,
      media_name: originalAttachment?.name || null,
      media_mime_type: originalAttachment?.type || null,
      media_size_bytes: originalAttachment?.size || null,
      caption: messageText || null,
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      tempMessage,
    ]);

    setDraft("");
    setAttachment(null);
    setIsSending(true);
    setSendError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: selectedPhone,
          message: messageText,
          mediaUrl,
          mediaType,
          mediaName: originalAttachment?.name || null,
          mediaMimeType: originalAttachment?.type || null,
          mediaSizeBytes: originalAttachment?.size || null,
          caption: messageText || null,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || "Message failed to send."
        );
      }

      await refreshMessages();
    } catch (error) {
      console.error("Send message error:", error);

      setMessages((previousMessages) =>
        previousMessages.filter(
          (message) => message.id !== tempMessage.id
        )
      );

      setDraft(originalDraft);
      setAttachment(originalAttachment);
      setSendError(
        error instanceof Error
          ? error.message
          : "Message failed to send."
      );
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

      setMessages((previousMessages) =>
        previousMessages.filter(
          (message) => message.id !== messageId
        )
      );
    } catch (error) {
      console.error(error);
      window.alert("Failed to delete message.");
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

      setMessages((previousMessages) =>
        previousMessages.filter(
          (message) => message.phone_number !== selectedPhone
        )
      );

      setSelectedPhone(null);
      setMobileChatOpen(false);
    } catch (error) {
      console.error(error);
      window.alert("Failed to delete conversation.");
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

  function renderMessageMedia(message: Message) {
    if (!message.media_url) return null;

    const mediaType = message.media_type?.toLowerCase();
    const mimeType =
      message.media_mime_type?.toLowerCase() || "";

    const isImage =
      mediaType === "image" ||
      mimeType.startsWith("image/");

    const isVideo =
      mediaType === "video" ||
      mimeType.startsWith("video/");

    const isAudio =
      mediaType === "audio" ||
      mimeType.startsWith("audio/");

    if (isImage) {
      return (
        <a
          href={message.media_url}
          target="_blank"
          rel="noreferrer"
          className="mb-2 block max-w-[280px] overflow-hidden rounded-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.media_url}
            alt={message.media_name || "WhatsApp attachment"}
            className="max-h-[220px] max-w-full w-auto rounded-xl object-contain"
          />
        </a>
      );
    }

    if (isVideo) {
      return (
        <video
          src={message.media_url}
          controls
          preload="metadata"
          className="mb-2 max-h-[220px] w-full max-w-[280px] rounded-xl bg-slate-900"
        >
          Your browser does not support video playback.
        </video>
      );
    }

    if (isAudio) {
      return (
        <audio
          src={message.media_url}
          controls
          preload="metadata"
          className="mb-2 w-full"
        >
          Your browser does not support audio playback.
        </audio>
      );
    }

    return (
      <a
        href={message.media_url}
        target="_blank"
        rel="noreferrer"
        className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:bg-slate-100"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-800">
            {message.media_name || "Open attachment"}
          </div>

          <div className="mt-0.5 text-xs text-slate-500">
            {message.media_mime_type || "Document"}
            {message.media_size_bytes
              ? ` â€¢ ${formatFileSize(
                  message.media_size_bytes
                )}`
              : ""}
          </div>
        </div>
      </a>
    );
  }

  const unreadTotal = conversationMeta.reduce(
    (total, conversation) =>
      total + conversation.unreadCount,
    0
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop navigation */}
      <aside className="hidden w-[230px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="text-xl font-bold tracking-tight text-slate-900">
            Hyssop
          </div>

          <div className="mt-0.5 text-xs text-slate-500">
            WhatsApp Inbox
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/inbox";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-50 font-semibold text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />

                  <span>{item.label}</span>

                  {item.label === "Inbox" &&
                    unreadTotal > 0 && (
                      <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {unreadTotal}
                      </span>
                    )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main application */}
      <main className="flex min-w-0 flex-1">
        {/* Conversation list */}
        <section
          className={`flex w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-[360px] ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-slate-200 px-4 py-4 md:px-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Inbox
                </h1>

                <p className="mt-0.5 text-xs text-slate-500">
                  {conversationMeta.length} conversation
                  {conversationMeta.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void refreshMessages()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search conversations..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="mt-3 flex gap-2">
              {(
                [
                  ["all", "All"],
                  ["unread", "Unread"],
                  ["expired", "Expired"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    filter === value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {loading ? (
              <div className="p-5 text-sm text-slate-500">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>

                <p className="mt-3 text-sm font-medium text-slate-700">
                  No conversations found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Incoming WhatsApp messages will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map(
                ({
                  phone,
                  displayName,
                  lastMessage,
                  unreadCount,
                  expired,
                }) => {
                  const active = selectedPhone === phone;
                  const hasSavedName =
                    displayName !== phone;

                  return (
                    <button
                      key={phone}
                      type="button"
                      onClick={() => openChat(phone)}
                      className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left transition ${
                        active
                          ? "bg-emerald-50/70"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {displayName
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-sm font-semibold text-slate-800">
                            {displayName}
                          </div>

                          <div className="shrink-0 text-[11px] text-slate-400">
                            {formatTime(
                              lastMessage?.created_at
                            )}
                          </div>
                        </div>

                        {hasSavedName && (
                          <div className="mt-0.5 truncate text-[11px] text-slate-400">
                            {phone}
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className="truncate text-xs text-slate-500">
                            {getMessagePreview(lastMessage)}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {expired && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                Expired
                              </span>
                            )}

                            {unreadCount > 0 &&
                              selectedPhone !== phone && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
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

          {/* Mobile bottom navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
            <div className="mx-auto flex h-[68px] max-w-md items-center justify-around">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/inbox";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium ${
                      active
                        ? "text-emerald-700"
                        : "text-slate-400"
                    }`}
                  >
                    <Icon className="h-[19px] w-[19px]" />

                    <span>{item.label}</span>

                    {item.label === "Inbox" &&
                      unreadTotal > 0 && (
                        <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                          {unreadTotal}
                        </span>
                      )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </section>

        {/* Chat */}
        <section
          className={`min-w-0 flex-1 flex-col bg-white ${
            mobileChatOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Chat header */}
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={closeMobileChat}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {selectedPhone ? (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {activeDisplayName
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {activeDisplayName}
                    </div>

                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="truncate">
                        {selectedPhone}
                      </span>

                      <span className="text-slate-300">
                        â€¢
                      </span>

                      <span
                        className={
                          activeConversationExpired
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }
                      >
                        {activeConversationExpired
                          ? "24h window expired"
                          : "24h window active"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Conversations
                  </div>

                  <div className="text-xs text-slate-400">
                    Select a conversation
                  </div>
                </div>
              )}
            </div>

            {selectedPhone && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setShowConversationMenu(
                      (value) => !value
                    )
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {showConversationMenu && (
                  <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConversationMenu(false);
                        void handleDeleteConversation();
                      }}
                      disabled={deletingConversation}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete conversation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 md:px-8">
            {!selectedPhone ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                    <UserRound className="h-7 w-7 text-slate-300" />
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-slate-800">
                    Select a conversation
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose a WhatsApp conversation from the
                    list to view messages.
                  </p>
                </div>
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No messages in this conversation.
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-3">
                {activeMessages.map((message, index) => {
                  const isIncoming =
                    message.direction === "incoming";

                  const previousMessage =
                    activeMessages[index - 1];

                  const showDayLabel =
                    !previousMessage ||
                    formatRelativeDay(
                      previousMessage.created_at
                    ) !==
                      formatRelativeDay(
                        message.created_at
                      );

                  const displayedText =
                    message.caption?.trim() ||
                    message.message_text?.trim() ||
                    "";

                  return (
                    <div key={message.id}>
                      {showDayLabel && (
                        <div className="my-5 flex justify-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-400 shadow-sm ring-1 ring-slate-200">
                            {formatRelativeDay(
                              message.created_at
                            )}
                          </span>
                        </div>
                      )}

                      <div
                        className={`group flex ${
                          isIncoming
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`min-w-0 max-w-[85%] md:max-w-[65%] ${
                            isIncoming
                              ? "rounded-2xl rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                              : "rounded-2xl rounded-br-md bg-emerald-600 text-white shadow-sm"
                          }`}
                        >
                          <div className="px-4 py-3">
                            {renderMessageMedia(message)}

                            {displayedText && (
                              <div className="whitespace-pre-wrap break-words text-sm leading-6">
                                {displayedText}
                              </div>
                            )}

                            <div
                              className={`mt-2 flex items-center justify-end gap-2 text-[10px] ${
                                isIncoming
                                  ? "text-slate-400"
                                  : "text-emerald-100"
                              }`}
                            >
                              <span>
                                {formatTime(
                                  message.created_at
                                )}
                              </span>

                              {!isIncoming &&
                                message.status && (
                                  <span className="flex items-center gap-1">
                                    <CheckCheck className="h-3 w-3" />
                                    {message.status}
                                  </span>
                                )}

                              {!String(
                                message.id
                              ).startsWith("temp-") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleDeleteMessage(
                                      message.id
                                    )
                                  }
                                  disabled={
                                    deletingMessageId ===
                                    message.id
                                  }
                                  className={`opacity-0 transition group-hover:opacity-100 ${
                                    isIncoming
                                      ? "text-slate-400 hover:text-red-500"
                                      : "text-emerald-100 hover:text-white"
                                  }`}
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
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

          {/* Composer */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 md:px-6 md:py-4">
            {sendError && (
              <div className="mx-auto mb-3 max-w-4xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {sendError}
              </div>
            )}

            {selectedPhone &&
              activeConversationExpired && (
                <div className="mx-auto mb-3 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  This conversation is outside the 24-hour
                  customer-care window. A new customer message
                  is required before free-form replies can be
                  sent.
                </div>
              )}

            {attachment && (
              <div className="mx-auto mb-3 flex max-w-4xl items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-emerald-600" />

                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-slate-700">
                      {attachment.name}
                    </div>

                    <div className="text-[10px] text-slate-400">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mx-auto flex max-w-4xl items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleAttachmentChange}
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  !selectedPhone ||
                  isSending ||
                  activeConversationExpired
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                title="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              <button
                type="button"
                disabled={!selectedPhone}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 sm:flex"
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>

              <textarea
                value={draft}
                onChange={(event) =>
                  setDraft(event.target.value)
                }
                placeholder={
                  !selectedPhone
                    ? "Select a conversation..."
                    : activeConversationExpired
                      ? "24-hour reply window expired"
                      : "Type a message..."
                }
                disabled={
                  !selectedPhone ||
                  isSending ||
                  activeConversationExpired
                }
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={
                  !selectedPhone ||
                  (!draft.trim() && !attachment) ||
                  isSending ||
                  activeConversationExpired
                }
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />

                <span className="hidden sm:inline">
                  {isSending ? "Sending" : "Send"}
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
