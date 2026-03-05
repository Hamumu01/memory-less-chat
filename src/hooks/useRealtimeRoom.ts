import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Rate limiting: max messages per window
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 5000; // 5 seconds

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface RoomUser {
  username: string;
}

interface UseRealtimeRoomOptions {
  roomId: number;
  username: string;
  userId: string;
}

export function useRealtimeRoom({ roomId, username, userId }: UseRealtimeRoomOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Rate limiting state
  const msgTimestampsRef = useRef<number[]>([]);
  // Typing indicator: map of userId -> timeout handle
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!roomId || !username || !userId) return;

    const channelName = `ghost-room-${roomId}`;
    // Use userId as the presence key to prevent spoofing
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const currentUsers: RoomUser[] = Object.entries(state).map(([_uid, presences]) => ({
        username: (presences as any[])[0]?.username || "unknown",
      }));

      if (currentUsers.length > 2) {
        setError("room_full");
        channel.unsubscribe();
        return;
      }

      setUsers(currentUsers);
    });

    // Validate sender on incoming broadcast messages
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      if (payload && payload.senderId && payload.senderId !== userId) {
        // Only accept messages from other users (own messages added locally)
        setMessages((prev) => [...prev, payload as ChatMessage]);
        // Clear typing indicator for this sender when they send a message
        setTypingUsers((prev) => prev.filter((u) => u !== payload.senderName));
      }
    });

    // Typing indicator events
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload || payload.senderId === userId) return;
      const typer = payload.username as string;
      if (!typer) return;

      setTypingUsers((prev) => (prev.includes(typer) ? prev : [...prev, typer]));

      // Clear typing indicator after 3s of no update
      if (typingTimeoutsRef.current[payload.senderId]) {
        clearTimeout(typingTimeoutsRef.current[payload.senderId]);
      }
      typingTimeoutsRef.current[payload.senderId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== typer));
        delete typingTimeoutsRef.current[payload.senderId];
      }, 3000);
    });

    // Typing stop events
    channel.on("broadcast", { event: "typing_stop" }, ({ payload }) => {
      if (!payload || payload.senderId === userId) return;
      const typer = payload.username as string;
      if (typingTimeoutsRef.current[payload.senderId]) {
        clearTimeout(typingTimeoutsRef.current[payload.senderId]);
        delete typingTimeoutsRef.current[payload.senderId];
      }
      setTypingUsers((prev) => prev.filter((u) => u !== typer));
    });

    channel.on("presence", { event: "join" }, ({ key }) => {
      if (key !== userId) {
        const state = channel.presenceState();
        const joinedPresence = state[key];
        const joinedUsername = joinedPresence ? (joinedPresence as any[])[0]?.username : "someone";
        const systemMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: "system",
          text: `${joinedUsername} joined the room`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, systemMsg]);
      }
    });

    channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      if (key !== userId) {
        const leftUsername = leftPresences?.[0]?.username || "someone";
        const systemMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: "system",
          text: `${leftUsername} left the room`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, systemMsg]);
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const state = channel.presenceState();
        const currentCount = Object.keys(state).length;

        if (currentCount >= 2) {
          setError("room_full");
          channel.unsubscribe();
          return;
        }

        // Track presence with both userId (key) and username (metadata)
        await channel.track({ username, userId, joined_at: Date.now() });
        setJoined(true);
      }
    });

    return () => {
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
      setMessages([]);
      setUsers([]);
      setJoined(false);
      setTypingUsers([]);
      // Clear all typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, [roomId, username, userId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!channelRef.current || !joined) return;

      // Rate limiting: allow max RATE_LIMIT_MAX msgs per RATE_LIMIT_WINDOW_MS
      const now = Date.now();
      msgTimestampsRef.current = msgTimestampsRef.current.filter(
        (ts) => now - ts < RATE_LIMIT_WINDOW_MS
      );
      if (msgTimestampsRef.current.length >= RATE_LIMIT_MAX) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), RATE_LIMIT_WINDOW_MS);
        return;
      }
      msgTimestampsRef.current.push(now);

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: username,
        text,
        timestamp: Date.now(),
      };
      // Add to own messages immediately
      setMessages((prev) => [...prev, msg]);
      // Broadcast with senderId for verification
      channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: { ...msg, senderId: userId, senderName: username },
      });
    },
    [joined, username, userId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !joined) return;
      channelRef.current.send({
        type: "broadcast",
        event: isTyping ? "typing" : "typing_stop",
        payload: { senderId: userId, username },
      });
    },
    [joined, userId, username]
  );

  return { messages, users, error, joined, typingUsers, rateLimited, sendMessage, sendTyping };
}
