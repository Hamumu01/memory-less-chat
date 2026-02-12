import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
}

export function useRealtimeRoom({ roomId, username }: UseRealtimeRoomOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Join room via Presence
  useEffect(() => {
    if (!roomId || !username) return;

    const channelName = `ghost-room-${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: username } },
    });

    channelRef.current = channel;

    // Listen for presence sync to track users
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const currentUsers: RoomUser[] = Object.keys(state).map((key) => ({
        username: key,
      }));

      // Enforce 2-user limit: if already 2 users and we're not one of them, reject
      if (currentUsers.length > 2) {
        // This shouldn't happen due to pre-check, but safeguard
        setError("room_full");
        channel.unsubscribe();
        return;
      }

      setUsers(currentUsers);
    });

    // Listen for broadcast messages (zero persistence — relay only)
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      if (payload) {
        setMessages((prev) => [...prev, payload as ChatMessage]);
      }
    });

    // Listen for system events (user joined/left notifications)
    channel.on("presence", { event: "join" }, ({ key }) => {
      if (key !== username) {
        const systemMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: "system",
          text: `${key} joined the room`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, systemMsg]);
      }
    });

    channel.on("presence", { event: "leave" }, ({ key }) => {
      if (key !== username) {
        const systemMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: "system",
          text: `${key} left the room`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, systemMsg]);
      }
    });

    // Subscribe and track presence
    channel
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Check current presence before joining
          const state = channel.presenceState();
          const currentCount = Object.keys(state).length;

          if (currentCount >= 2) {
            setError("room_full");
            channel.unsubscribe();
            return;
          }

          // Track our presence
          await channel.track({ username, joined_at: Date.now() });
          setJoined(true);
        }
      });

    // Cleanup: untrack and unsubscribe (wipes all local state)
    return () => {
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
      setMessages([]);
      setUsers([]);
      setJoined(false);
    };
  }, [roomId, username]);

  // Send message via broadcast (never stored)
  const sendMessage = useCallback(
    (text: string) => {
      if (!channelRef.current || !joined) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: username,
        text,
        timestamp: Date.now(),
      };
      // Add to own messages immediately
      setMessages((prev) => [...prev, msg]);
      // Broadcast to others
      channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: msg,
      });
    },
    [joined, username]
  );

  return { messages, users, error, joined, sendMessage };
}
