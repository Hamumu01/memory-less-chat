import type { ChatMessage } from "@/lib/roomStore";

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex ghost-slide-up ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-2.5
          ${isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"}
        `}
      >
        {!isOwn && (
          <p className="text-xs font-semibold text-primary mb-1">
            {message.sender}
          </p>
        )}
        <p className="text-sm leading-relaxed break-words">{message.text}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
