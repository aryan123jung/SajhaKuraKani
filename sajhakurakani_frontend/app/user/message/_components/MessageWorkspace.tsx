"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ConversationMessage,
  MessageConversationSummary,
  MessageUserProfile,
} from "@/lib/api/messages";
import {
  mergeFriendsIntoConversations,
  type FriendCardProfile,
  type MessageSidebarConversation,
} from "./messageListUtils";

type MessageWorkspaceProps = {
  currentUserId: string;
  initialFriends: FriendCardProfile[];
  initialConversations: MessageSidebarConversation[];
  initialSelectedFriendId: string | null;
  initialSelectedUser: MessageUserProfile | null;
  initialMessages: ConversationMessage[];
  initialLoadError?: string;
};

type ConversationThreadResponse = {
  success: boolean;
  data?: {
    conversation: {
      pairKey: string;
      otherUser: MessageUserProfile;
    };
    messages: ConversationMessage[];
  };
  message?: string;
};

type ConversationListResponse = {
  success: boolean;
  data?: MessageConversationSummary[];
  message?: string;
};

type ReadConversationResponse = {
  success: boolean;
  data?: {
    updatedCount: number;
  };
};

type SendMessageResponse = {
  success: boolean;
  data?: {
    pairKey: string;
    recipientUserId: string;
    message: ConversationMessage;
  };
  message?: string;
};

type SocketAuthResponse = {
  success: boolean;
  token?: string;
  message?: string;
};

type ChatMessageEventPayload = {
  senderUserId: string;
  recipientUserId: string;
  pairKey: string;
  message: ConversationMessage;
};

type ChatConversationReadEventPayload = {
  readerUserId: string;
  otherUserId: string;
  pairKey: string;
  updatedCount: number;
};

type SocketAcknowledge<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const formatConversationTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return sameDay
    ? date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
};

const formatMessageTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const getInitials = (user: MessageUserProfile) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() ||
  user.username.slice(0, 2).toUpperCase();

const dispatchStartCall = (
  callee: MessageUserProfile,
  callType: "audio" | "video"
) => {
  window.dispatchEvent(
    new CustomEvent("sajha-call:start", {
      detail: {
        callee,
        callType,
      },
    })
  );
};

const reorderConversationToTop = (
  conversations: MessageSidebarConversation[],
  nextConversation: MessageSidebarConversation
) => {
  const filteredConversations = conversations.filter(
    (conversation) => conversation.otherUser.id !== nextConversation.otherUser.id
  );

  return [nextConversation, ...filteredConversations];
};

const THREAD_PAGE_SIZE = 50;
const CONVERSATION_SYNC_INTERVAL_MS = 30 * 1000;
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "https://localhost:5050";

const fetchSocketToken = async () => {
  const response = await fetch("/api/realtime/socket-auth", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json()) as SocketAuthResponse;

  if (!response.ok || !payload.success || !payload.token) {
    throw new Error(payload.message || "Unable to prepare realtime access right now.");
  }

  return payload.token;
};

export default function MessageWorkspace({
  currentUserId,
  initialFriends,
  initialConversations,
  initialSelectedFriendId,
  initialSelectedUser,
  initialMessages,
  initialLoadError = "",
}: MessageWorkspaceProps) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const connectRetryRef = useRef(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const notificationAudioUnlockedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const loadConversationsRef = useRef<() => Promise<void>>(async () => {});
  const loadThreadRef = useRef<(friendUserId: string) => Promise<void>>(async () => {});
  const markConversationReadRef = useRef<(friendUserId: string) => Promise<void>>(async () => {});
  const [conversationQuery, setConversationQuery] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const [friendProfiles] = useState<FriendCardProfile[]>(initialFriends);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(() => {
    if (initialSelectedFriendId) {
      return initialSelectedFriendId;
    }

    return initialConversations[0]?.otherUser.id ?? null;
  });
  const [selectedUser, setSelectedUser] = useState<MessageUserProfile | null>(
    initialSelectedUser ?? initialConversations[0]?.otherUser ?? null
  );
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [listError, setListError] = useState(initialLoadError);
  const [threadError, setThreadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const deferredConversationQuery = useDeferredValue(conversationQuery);
  const selectedConversation =
    selectedFriendId
      ? conversations.find((conversation) => conversation.otherUser.id === selectedFriendId) ??
        null
      : null;
  const selectedFriendIdRef = useRef<string | null>(selectedFriendId);
  const selectedUserRef = useRef<MessageUserProfile | null>(selectedUser);
  const selectedConversationRef = useRef<MessageSidebarConversation | null>(
    selectedConversation
  );
  const conversationsRef = useRef<MessageSidebarConversation[]>(conversations);
  const friendProfilesRef = useRef<FriendCardProfile[]>(friendProfiles);

  const normalizedConversationQuery = deferredConversationQuery.trim().toLowerCase();
  const filteredConversations = !normalizedConversationQuery
    ? conversations
    : conversations.filter((conversation) => {
        const fullName = `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
          .trim()
          .toLowerCase();
        const preview = conversation.latestMessage.content.toLowerCase();

        return (
          fullName.includes(normalizedConversationQuery) ||
          conversation.otherUser.username.toLowerCase().includes(normalizedConversationQuery) ||
          preview.includes(normalizedConversationQuery)
        );
      });

  useEffect(() => {
    const notificationAudio = new Audio("/sounds/notification.mp3");
    notificationAudio.preload = "auto";
    notificationAudioRef.current = notificationAudio;

    const unlockNotificationAudio = async () => {
      if (notificationAudioUnlockedRef.current) {
        return;
      }

      try {
        notificationAudio.muted = true;
        notificationAudio.volume = 0;
        await notificationAudio.play();
        notificationAudio.pause();
        notificationAudio.currentTime = 0;
        notificationAudio.muted = false;
        notificationAudio.volume = 1;
        notificationAudioUnlockedRef.current = true;
      } catch {
        notificationAudio.muted = false;
        notificationAudio.volume = 1;
      }
    };

    const handleUserInteraction = () => {
      void unlockNotificationAudio();
    };

    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      notificationAudio.pause();
      notificationAudio.currentTime = 0;
      notificationAudioRef.current = null;
      notificationAudioUnlockedRef.current = false;
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    const notificationAudio = notificationAudioRef.current;

    if (!notificationAudio) {
      return;
    }

    notificationAudio.currentTime = 0;
    void notificationAudio.play().catch(() => {
      return;
    });
  }, []);

  const syncSelectedFriendUrl = (friendUserId: string | null) => {
    if (!friendUserId) {
      router.replace("/user/message", { scroll: false });
      return;
    }

    router.replace(`/user/message?friend=${encodeURIComponent(friendUserId)}`, {
      scroll: false,
    });
  };

  const mergeMessages = (
    currentMessages: ConversationMessage[],
    incomingMessage: ConversationMessage
  ) => {
    const existingMessageIndex = currentMessages.findIndex(
      (message) => message._id === incomingMessage._id
    );

    if (existingMessageIndex >= 0) {
      return currentMessages.map((message) =>
        message._id === incomingMessage._id ? incomingMessage : message
      );
    }

    const temporaryMessageIndex = currentMessages.findIndex(
      (message) =>
        message._id.startsWith("temp-") &&
        message.sender === incomingMessage.sender &&
        message.recipient === incomingMessage.recipient &&
        message.content === incomingMessage.content
    );

    if (temporaryMessageIndex >= 0) {
      return currentMessages.map((message, index) =>
        index === temporaryMessageIndex ? incomingMessage : message
      );
    }

    return [...currentMessages, incomingMessage];
  };

  const resolveUserProfile = (otherUserId: string): MessageUserProfile | null => {
    if (selectedUserRef.current?.id === otherUserId) {
      return selectedUserRef.current;
    }

    const existingConversation = conversationsRef.current.find(
      (conversation) => conversation.otherUser.id === otherUserId
    );
    if (existingConversation) {
      return existingConversation.otherUser;
    }

    const friendProfile = friendProfilesRef.current.find((friend) => friend.id === otherUserId);
    if (!friendProfile) {
      return null;
    }

    return {
      id: friendProfile.id,
      firstName: friendProfile.firstName,
      lastName: friendProfile.lastName,
      username: friendProfile.username,
      profileUrl: friendProfile.profileUrl ?? null,
    };
  };

  const loadConversations = async () => {
    try {
      const conversationsResponse = await fetch("/api/messages/conversations?size=30", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const conversationsPayload =
        (await conversationsResponse.json()) as ConversationListResponse;

      if (!conversationsResponse.ok || !conversationsPayload.success) {
        throw new Error(
          conversationsPayload.message || "Unable to load your conversations right now."
        );
      }

      setConversations((currentConversations) => {
        const activeConversation =
          selectedFriendId && selectedUser
            ? currentConversations.find(
                (conversation) => conversation.otherUser.id === selectedFriendId
              )
            : undefined;

        return mergeFriendsIntoConversations({
          currentUserId,
          conversations: conversationsPayload.data ?? [],
          friends: friendProfiles,
          selectedFriendId,
          selectedUser: activeConversation?.otherUser ?? selectedUser,
        });
      });
      setListError("");
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : "Unable to load your conversations right now."
      );
    }
  };

  const markSelectedConversationRead = async (friendUserId: string) => {
    const activeSocket = socketRef.current;

    if (activeSocket?.connected) {
      try {
        await new Promise<void>((resolve, reject) => {
          activeSocket.emit(
            "chat:mark-read",
            {
              friendUserId,
            },
            (acknowledge: SocketAcknowledge<ReadConversationResponse["data"]>) => {
              if (acknowledge?.success) {
                resolve();
                return;
              }

              reject(
                new Error(
                  acknowledge?.message || "Unable to update this conversation right now."
                )
              );
            }
          );
        });

        const readTimestamp = new Date().toISOString();
        setConversations((currentConversations) =>
          currentConversations.map((conversation) =>
            conversation.otherUser.id === friendUserId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
        );
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.recipient === currentUserId && !message.readAt
              ? { ...message, readAt: readTimestamp }
              : message
          )
        );
        return;
      } catch {
        // Fall back to the HTTP route if realtime acknowledgement fails.
      }
    }

    try {
      const response = await fetch(
        `/api/messages/conversations/${encodeURIComponent(friendUserId)}/read`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );
      const payload = (await response.json()) as ReadConversationResponse;

      if (!response.ok || !payload.success) {
        return;
      }

      const readTimestamp = new Date().toISOString();
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.otherUser.id === friendUserId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.recipient === currentUserId && !message.readAt
            ? { ...message, readAt: readTimestamp }
            : message
        )
      );
    } catch {
      return;
    }
  };

  const loadThread = async (friendUserId: string) => {
    try {
      setIsThreadLoading(true);
      const response = await fetch(
        `/api/messages/conversations/${encodeURIComponent(friendUserId)}?size=${THREAD_PAGE_SIZE}`,
        {
          cache: "no-store",
          credentials: "same-origin",
        }
      );
      const payload = (await response.json()) as ConversationThreadResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Unable to load this conversation right now.");
      }

      setSelectedUser(payload.data.conversation.otherUser);
      setMessages([...payload.data.messages].reverse());
      setThreadError("");
      await markSelectedConversationRead(friendUserId);
    } catch (error) {
      setMessages([]);
      setThreadError(
        error instanceof Error
          ? error.message
          : "Unable to load this conversation right now."
      );
    } finally {
      setIsThreadLoading(false);
    }
  };

  useEffect(() => {
    loadConversationsRef.current = loadConversations;
    loadThreadRef.current = loadThread;
    markConversationReadRef.current = markSelectedConversationRead;
  });

  useEffect(() => {
    selectedFriendIdRef.current = selectedFriendId;
  }, [selectedFriendId]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    friendProfilesRef.current = friendProfiles;
  }, [friendProfiles]);

  useEffect(() => {
    let isDisposed = false;

    const initializeSocket = async () => {
      try {
        const token = await fetchSocketToken();

        if (isDisposed) {
          return;
        }

        const socket = io(SOCKET_URL, {
          autoConnect: false,
          transports: ["websocket", "polling"],
          withCredentials: true,
          auth: { token },
        });

        socket.on("connect", () => {
          connectRetryRef.current = false;
          setListError("");
          void loadConversationsRef.current();

          if (
            selectedFriendIdRef.current &&
            selectedConversationRef.current?.hasConversation
          ) {
            void loadThreadRef.current(selectedFriendIdRef.current);
          }
        });

        socket.on("connect_error", async () => {
          if (connectRetryRef.current) {
            return;
          }

          connectRetryRef.current = true;

          try {
            const nextToken = await fetchSocketToken();
            socket.auth = { token: nextToken };
            socket.connect();
          } catch {
            setListError("Realtime messaging is temporarily unavailable.");
          }
        });

        socket.on("chat:message", (payload: ChatMessageEventPayload) => {
          const otherUserId =
            payload.message.sender === currentUserId
              ? payload.message.recipient
              : payload.message.sender;
          const otherUser = resolveUserProfile(otherUserId);

          if (!otherUser) {
            void loadConversationsRef.current();
            return;
          }

          setConversations((currentConversations) => {
            const existingConversation = currentConversations.find(
              (conversation) => conversation.otherUser.id === otherUserId
            );
            const shouldIncrementUnread =
              payload.message.sender !== currentUserId &&
              selectedFriendIdRef.current !== otherUserId;

            return reorderConversationToTop(currentConversations, {
              pairKey: payload.pairKey,
              otherUser,
              unreadCount: shouldIncrementUnread
                ? (existingConversation?.unreadCount ?? 0) + 1
                : 0,
              latestMessage: payload.message,
              hasConversation: true,
            });
          });

          if (payload.message.sender !== currentUserId) {
            playNotificationSound();
          }

          if (selectedFriendIdRef.current === otherUserId) {
            setMessages((currentMessages) =>
              mergeMessages(currentMessages, payload.message)
            );
            setThreadError("");

            if (
              payload.message.sender !== currentUserId &&
              document.visibilityState === "visible"
            ) {
              void markConversationReadRef.current(otherUserId);
            }
          }
        });

        socket.on(
          "chat:conversation-read",
          (payload: ChatConversationReadEventPayload) => {
            const readTimestamp = new Date().toISOString();

            if (payload.readerUserId === currentUserId) {
              setConversations((currentConversations) =>
                currentConversations.map((conversation) =>
                  conversation.otherUser.id === payload.otherUserId
                    ? { ...conversation, unreadCount: 0 }
                    : conversation
                )
              );
              setMessages((currentMessages) =>
                currentMessages.map((message) =>
                  message.recipient === currentUserId && !message.readAt
                    ? { ...message, readAt: readTimestamp }
                    : message
                )
              );
              return;
            }

            if (
              payload.otherUserId === currentUserId &&
              selectedFriendIdRef.current === payload.readerUserId
            ) {
              setMessages((currentMessages) =>
                currentMessages.map((message) =>
                  message.sender === currentUserId &&
                  message.recipient === payload.readerUserId &&
                  !message.readAt
                    ? { ...message, readAt: readTimestamp }
                    : message
                )
              );
            }
          }
        );

        socketRef.current = socket;
        socket.connect();
      } catch {
        setListError("Realtime messaging is temporarily unavailable.");
      }
    };

    void initializeSocket();

    return () => {
      isDisposed = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, playNotificationSound]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadConversationsRef.current();
    }, CONVERSATION_SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleConversationSelect = (conversation: MessageSidebarConversation) => {
    const friendUserId = conversation.otherUser.id;
    setSelectedFriendId(friendUserId);
    setSelectedUser(conversation.otherUser);
    setThreadError("");
    setSendError("");
    syncSelectedFriendUrl(friendUserId);

    if (!conversation.hasConversation) {
      setMessages([]);
      return;
    }

    void loadThread(friendUserId);
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = composerValue.trim();
    if (!trimmedMessage || !selectedFriendId || !selectedUser || isSending) {
      return;
    }

    const optimisticTimestamp = new Date().toISOString();
    const temporaryMessageId = `temp-${Date.now()}`;
    const optimisticMessage: ConversationMessage = {
      _id: temporaryMessageId,
      pairKey: `${currentUserId}:${selectedFriendId}`,
      participants: [currentUserId, selectedFriendId],
      sender: currentUserId,
      recipient: selectedFriendId,
      content: trimmedMessage,
      createdAt: optimisticTimestamp,
      updatedAt: optimisticTimestamp,
    };

    setComposerValue("");
    setSendError("");
    setIsSending(true);
    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);
    setConversations((currentConversations) =>
      reorderConversationToTop(currentConversations, {
        pairKey: optimisticMessage.pairKey,
        otherUser: selectedUser,
        unreadCount: 0,
        latestMessage: optimisticMessage,
        hasConversation: true,
      })
    );

    try {
      let payloadData: SendMessageResponse["data"] | undefined;
      const activeSocket = socketRef.current;

      if (activeSocket?.connected) {
        const acknowledge = await new Promise<
          SocketAcknowledge<SendMessageResponse["data"]>
        >((resolve, reject) => {
          activeSocket.emit(
            "chat:send-message",
            {
              friendUserId: selectedFriendId,
              content: trimmedMessage,
            },
            (acknowledgePayload: SocketAcknowledge<SendMessageResponse["data"]>) => {
              if (acknowledgePayload?.success) {
                resolve(acknowledgePayload);
                return;
              }

              reject(
                new Error(
                  acknowledgePayload?.message || "Unable to send this message right now."
                )
              );
            }
          );
        });

        payloadData = acknowledge.data;
      } else {
        const response = await fetch(
          `/api/messages/conversations/${encodeURIComponent(selectedFriendId)}`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: trimmedMessage }),
          }
        );
        const payload = (await response.json()) as SendMessageResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message || "Unable to send this message right now.");
        }

        payloadData = payload.data;
      }

      if (!payloadData) {
        throw new Error("Unable to send this message right now.");
      }

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message._id === temporaryMessageId ? payloadData.message : message
        )
      );
      setConversations((currentConversations) =>
        reorderConversationToTop(currentConversations, {
          pairKey: payloadData.pairKey,
          otherUser: selectedUser,
          unreadCount: 0,
          latestMessage: payloadData.message,
          hasConversation: true,
        })
      );
      setThreadError("");
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message._id !== temporaryMessageId)
      );
      setComposerValue(trimmedMessage);
      setSendError(
        error instanceof Error ? error.message : "Unable to send this message right now."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
      <aside className="rounded-[24px] border border-[#edd8cb] bg-white/88 p-5 shadow-[0_18px_42px_rgba(128,84,53,0.07)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
          Messages
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#1d243f]">
          Your inbox
        </h1>
        <p className="mt-2 text-sm leading-7 text-[#6b7080]">
          Open a thread with your approved friends and continue the conversation safely.
        </p>

        <div className="mt-4 rounded-[16px] border border-[#efe0d6] bg-[#fff8f3] px-4 py-3">
          <input
            type="search"
            value={conversationQuery}
            onChange={(event) => setConversationQuery(event.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-[0.92rem] text-[#1d243f] outline-none placeholder:text-[#8a8290]"
          />
        </div>

        {listError ? (
          <div className="mt-4 rounded-[14px] border border-[#f2c5bb] bg-[#fff1ec] px-4 py-3 text-sm text-[#b14f3f]">
            {listError}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="rounded-[16px] border border-[#efe0d6] bg-[#fffaf7] px-4 py-5 text-sm leading-7 text-[#6b7080]">
              No conversations yet. Open a friend profile or your friends page to start chatting.
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isActive = selectedFriendId === conversation.otherUser.id;

              return (
                <button
                  key={`${conversation.pairKey}-${conversation.otherUser.id}`}
                  type="button"
                  onClick={() => handleConversationSelect(conversation)}
                  className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[#efc3ae] bg-[#fff3ec] shadow-[0_10px_22px_rgba(241,111,56,0.08)]"
                      : "border-[#efe0d6] bg-[#fffaf7] hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                      {conversation.otherUser.profileUrl ? (
                        <img
                          src={conversation.otherUser.profileUrl}
                          alt={`${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(conversation.otherUser)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[0.98rem] font-semibold text-[#1d243f]">
                            {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                          </p>
                          <p className="truncate text-[0.77rem] text-[#7d7480]">
                            @{conversation.otherUser.username}
                          </p>
                        </div>
                        <p className="shrink-0 text-[0.72rem] text-[#8a8290]">
                          {formatConversationTime(conversation.latestMessage.createdAt)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="line-clamp-2 min-w-0 text-[0.82rem] leading-5 text-[#667086]">
                          {conversation.latestMessage.sender === currentUserId ? "You: " : ""}
                          {conversation.latestMessage.content}
                        </p>
                        {conversation.unreadCount > 0 ? (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-2 py-1 text-[0.68rem] font-semibold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="min-h-0 rounded-[24px] border border-[#edd8cb] bg-white/90 shadow-[0_18px_42px_rgba(128,84,53,0.07)] xl:h-[calc(100vh-9rem)]">
        {selectedUser ? (
          <div className="flex h-full min-h-[760px] flex-col xl:min-h-0">
            <div className="flex items-center justify-between gap-4 border-b border-[#eee3dc] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-sm font-semibold text-white">
                  {selectedUser.profileUrl ? (
                    <img
                      src={selectedUser.profileUrl}
                      alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(selectedUser)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[1.05rem] font-semibold text-[#1d243f]">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="truncate text-[0.82rem] text-[#7b7580]">
                    @{selectedUser.username}
                  </p>
                </div>
              </div>

              <Link
                href={`/user/profile/${selectedUser.id}`}
                className="rounded-[12px] border border-[#edd8cb] bg-[#fff8f3] px-3.5 py-2 text-[0.82rem] font-semibold text-[#546178] transition hover:bg-white"
              >
                View profile
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => dispatchStartCall(selectedUser, "audio")}
                  className="rounded-[12px] border border-[#edd8cb] bg-[#fff8f3] px-3.5 py-2 text-[0.82rem] font-semibold text-[#546178] transition hover:bg-white"
                >
                  Audio call
                </button>
                <button
                  type="button"
                  onClick={() => dispatchStartCall(selectedUser, "video")}
                  className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-3.5 py-2 text-[0.82rem] font-semibold text-white shadow-[0_10px_20px_rgba(241,111,56,0.14)] transition hover:opacity-95"
                >
                  Video call
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] px-5 py-5">
              {isThreadLoading ? (
                <div className="rounded-[16px] border border-[#efe0d6] bg-white/80 px-4 py-3 text-sm text-[#6b7080]">
                  Loading conversation...
                </div>
              ) : null}

              {threadError ? (
                <div className="rounded-[14px] border border-[#f2c5bb] bg-[#fff1ec] px-4 py-3 text-sm text-[#b14f3f]">
                  {threadError}
                </div>
              ) : null}

              {!isThreadLoading && !threadError && messages.length === 0 ? (
                <div className="flex h-full min-h-[360px] items-center justify-center">
                  <div className="max-w-md rounded-[20px] border border-[#efe0d6] bg-white/88 px-6 py-6 text-center shadow-[0_12px_28px_rgba(128,84,53,0.05)]">
                    <p className="text-[1.1rem] font-semibold text-[#1d243f]">
                      Start the conversation
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#6b7080]">
                      Your first message to {selectedUser.firstName} will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender === currentUserId;

                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-[20px] px-4 py-3 shadow-[0_10px_22px_rgba(128,84,53,0.05)] ${
                          isOwnMessage
                            ? "rounded-br-[8px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] text-white"
                            : "rounded-bl-[8px] border border-[#efe0d6] bg-white text-[#1d243f]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-[0.93rem] leading-6">
                          {message.content}
                        </p>
                        <div
                          className={`mt-2 flex items-center gap-2 text-[0.72rem] ${
                            isOwnMessage ? "text-white/82" : "text-[#8a8290]"
                          }`}
                        >
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {isOwnMessage ? (
                            <span>{message.readAt ? "Seen" : "Sent"}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="border-t border-[#eee3dc] bg-white/96 px-5 py-4"
            >
              {sendError ? (
                <div className="mb-3 rounded-[14px] border border-[#f2c5bb] bg-[#fff1ec] px-4 py-3 text-sm text-[#b14f3f]">
                  {sendError}
                </div>
              ) : null}

              <div className="flex items-end gap-3">
                <textarea
                  value={composerValue}
                  onChange={(event) => setComposerValue(event.target.value)}
                  placeholder={`Message ${selectedUser.firstName}...`}
                  rows={1}
                  maxLength={2000}
                  className="min-h-[56px] flex-1 resize-none rounded-[18px] border border-[#ecd9cf] bg-[#fffaf7] px-4 py-3 text-[0.92rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
                />
                <button
                  type="submit"
                  disabled={isSending || composerValue.trim().length === 0}
                  className="rounded-[16px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-3 text-[0.92rem] font-semibold text-white shadow-[0_10px_22px_rgba(241,111,56,0.16)] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex min-h-[760px] items-center justify-center px-6 py-10">
            <div className="max-w-lg rounded-[22px] border border-[#efe0d6] bg-white/88 px-6 py-7 text-center shadow-[0_12px_28px_rgba(128,84,53,0.05)]">
              <p className="text-[1.25rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                Choose a conversation
              </p>
              <p className="mt-2 text-sm leading-7 text-[#6b7080]">
                Select one of your approved friends on the left to open a secure message thread.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
