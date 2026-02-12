import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface RoomStatus {
  id: number;
  userCount: number;
  users: string[];
}

/**
 * Subscribes to presence on all 10 rooms to show live status on the dashboard.
 * Also checks that a username isn't already active in another room.
 */
export function useRoomPresence(username: string | undefined) {
  const [rooms, setRooms] = useState<RoomStatus[]>(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      userCount: 0,
      users: [],
    }))
  );
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!username) return;

    const channels: RealtimeChannel[] = [];

    for (let i = 1; i <= 10; i++) {
      const channelName = `ghost-room-${i}`;
      const roomId = i;

      const channel = supabase.channel(channelName);

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const usernames = Object.keys(state);
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId
              ? { ...r, userCount: usernames.length, users: usernames }
              : r
          )
        );
      });

      channel.subscribe();
      channels.push(channel);
    }

    channelsRef.current = channels;

    return () => {
      channels.forEach((ch) => ch.unsubscribe());
      channelsRef.current = [];
    };
  }, [username]);

  // Check if user is already in a room
  const getUserCurrentRoom = (): number | null => {
    for (const room of rooms) {
      if (room.users.includes(username || "")) {
        return room.id;
      }
    }
    return null;
  };

  return { rooms, getUserCurrentRoom };
}
