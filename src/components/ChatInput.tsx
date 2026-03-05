import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  rateLimited?: boolean;
}

export default function ChatInput({ onSend, onTyping, rateLimited }: ChatInputProps) {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
    }
  }, [onTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (val.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTyping?.(true);
      }
      // Reset the stop-typing timer on each keystroke
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(stopTyping, 2000);
    } else {
      // Input cleared — stop typing immediately
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopTyping();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    // Stop typing indicator when message is sent
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping();
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3 space-y-1">
      {rateLimited && (
        <p className="text-xs text-destructive animate-pulse px-1">
          ⚠️ Slow down — you&apos;re sending messages too fast!
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={handleChange}
          placeholder="Type a message..."
          maxLength={500}
          disabled={rateLimited}
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          className="glow-btn rounded-lg p-2.5 disabled:opacity-40"
          disabled={!text.trim() || rateLimited}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
