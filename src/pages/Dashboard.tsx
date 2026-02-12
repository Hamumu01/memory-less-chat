import { useNavigate } from "react-router-dom";
import { Ghost, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import RoomCard from "@/components/RoomCard";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { rooms, getUserCurrentRoom } = useRoomPresence(user?.username);

  const handleJoin = (roomId: number) => {
    if (!user) return;

    // Prevent same username in two rooms simultaneously
    const currentRoom = getUserCurrentRoom();
    if (currentRoom !== null) {
      toast.error(`You're already active in Room ${currentRoom}. Leave it first.`);
      return;
    }

    // Check capacity before navigating
    const room = rooms.find((r) => r.id === roomId);
    if (room && room.userCount >= 2) {
      toast.error("Room is full!");
      return;
    }

    navigate(`/room/${roomId}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Ghost className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">GhostChat</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Room Grid */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Rooms</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a room. Messages vanish when you leave.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={{ id: room.id, users: room.users, messages: [] }}
              onJoin={handleJoin}
            />
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          ⚠ Zero-persistence policy: all chats are erased when both users leave.
        </p>
      </main>
    </div>
  );
}
