import { Lock, Users, Ghost } from "lucide-react";
import type { Room } from "@/lib/roomStore";

interface RoomCardProps {
  room: Room;
  onJoin: (roomId: number) => void;
}

function getStatus(count: number) {
  if (count === 0) return { label: "Empty", color: "status-empty", canJoin: true };
  if (count === 1) return { label: "Waiting", color: "status-waiting", canJoin: true };
  return { label: "Full", color: "status-full", canJoin: false };
}

export default function RoomCard({ room, onJoin }: RoomCardProps) {
  const status = getStatus(room.users.length);

  return (
    <button
      onClick={() => status.canJoin && onJoin(room.id)}
      disabled={!status.canJoin}
      className={`
        group relative w-full rounded-lg border border-border bg-card p-5
        text-left transition-all duration-300 ghost-fade-in
        ${status.canJoin
          ? "hover:glow-border cursor-pointer hover:-translate-y-1"
          : "opacity-60 cursor-not-allowed"}
        ${room.users.length === 1 ? "pulse-waiting" : ""}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ghost className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            Room {room.id}
          </span>
        </div>

        {!status.canJoin && <Lock className="h-4 w-4 text-destructive" />}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {room.users.length}/2
          </span>
        </div>

        <span
          className={`text-xs font-medium px-2 py-1 rounded-full bg-${status.color}/20 text-${status.color}`}
          style={{
            backgroundColor:
              room.users.length === 0
                ? "hsl(0 0% 40% / 0.15)"
                : room.users.length === 1
                ? "hsl(187 100% 50% / 0.15)"
                : "hsl(0 62.8% 50% / 0.15)",
            color:
              room.users.length === 0
                ? "hsl(0 0% 60%)"
                : room.users.length === 1
                ? "hsl(187 100% 50%)"
                : "hsl(0 62.8% 60%)",
          }}
        >
          {status.label}
        </span>
      </div>
    </button>
  );
}
