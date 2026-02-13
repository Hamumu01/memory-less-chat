import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface RoomStatus {
  id: number;
  userCount: number;
  users: string[];
}

export function useRoomPresence(userId: string | undefined) {
  const [rooms, setRooms] = useState<RoomStatus[]>(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      userCount: 0,
      users: [],
    }))
  );
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!userId) return;

    const channels: RealtimeChannel[] = [];

    for (let i = 1; i <= 10; i++) {
      const channelName = `ghost-room-${i}`;
      const roomId = i;

      const channel = supabase.channel(channelName);

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // Extract usernames from presence metadata
        const usernames = Object.values(state).map(
          (presences) => (presences as any[])[0]?.username || "unknown"
        );
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
  }, [userId]);

  const getUserCurrentRoom = (username: string): number | null => {
    for (const room of rooms) {
      if (room.users.includes(username)) {
        return room.id;
      }
    }
    return null;
  };

  return { rooms, getUserCurrentRoom };
}
