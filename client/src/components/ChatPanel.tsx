import { FormEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "../types";

type ChatPanelProps = {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
};

export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();

    if (!text) {
      return;
    }

    onSendMessage(text);
    setDraft("");
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  }

  return (
    <section className="chat-panel" aria-label="Room chat">
      <div className="participants-heading">Chat</div>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 ? <p className="empty-chat">No messages yet.</p> : null}
        {messages.map((message) => (
          <article className="chat-message" key={message.id}>
            <div className="chat-meta">
              <strong>{message.userName}</strong>
              <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </div>
            <span>{message.text}</span>
          </article>
        ))}
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          aria-label="Chat message"
          maxLength={160}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message"
          value={draft}
        />
        <button className="icon-button" disabled={!draft.trim()} title="Send message" type="submit">
          <Send size={18} aria-hidden />
        </button>
      </form>
    </section>
  );
}
