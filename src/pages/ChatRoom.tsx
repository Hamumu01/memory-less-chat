import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Ghost, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRoom, leaveRoom, addMessage, type ChatMessage } from "@/lib/roomStore";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const roomId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const room = getRoom(roomId);

  useEffect(() => {
    if (!user || !room) {
      navigate("/dashboard");
      return;
    }
    // Load existing messages (in case user is already joined)
    setMessages([...room.messages]);
  }, [user, room, navigate]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleLeave = () => {
    if (user) leaveRoom(roomId, user.username);
    navigate("/dashboard");
  };

  const handleSend = (text: string) => {
    if (!user) return;
    const msg = addMessage(roomId, user.username, text);
    if (msg) {
      setMessages((prev) => [...prev, msg]);
    }
  };

  if (!room || !user) return null;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Ghost className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Room {roomId}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{room.users.length}/2</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Ghost className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No messages yet. Start the conversation.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/50">
                Messages disappear when you leave.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} isOwn={msg.sender === user.username} />
        ))}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} />
    </div>
  );
}
