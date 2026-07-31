import { MessageSquareText, NotebookTabs, StickyNote, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { NotesPanel } from "./NotesPanel";
import { ParticipantList } from "./ParticipantList";
import type { BoardPage, ChatMessage, User } from "../types";

type SidebarTab = "participants" | "chat" | "notes" | "pages";

type RightSidebarProps = {
  activePageId: string;
  currentUserId: string;
  messages: ChatMessage[];
  notes: string;
  onNotesChange: (notes: string) => void;
  onSelectPage: (pageId: string) => void;
  onSendMessage: (text: string) => void;
  pages: BoardPage[];
  participants: User[];
};

const tabs: Array<{ icon: typeof Users; label: string; value: SidebarTab }> = [
  { icon: Users, label: "People", value: "participants" },
  { icon: MessageSquareText, label: "Chat", value: "chat" },
  { icon: StickyNote, label: "Notes", value: "notes" },
  { icon: NotebookTabs, label: "Pages", value: "pages" }
];

export function RightSidebar({
  activePageId,
  currentUserId,
  messages,
  notes,
  onNotesChange,
  onSelectPage,
  onSendMessage,
  pages,
  participants
}: RightSidebarProps) {
  const [selectedTab, setSelectedTab] = useState<SidebarTab>(
    () => (sessionStorage.getItem("sketchspace:sidebar") as SidebarTab | null) ?? "participants"
  );

  useEffect(() => {
    sessionStorage.setItem("sketchspace:sidebar", selectedTab);
  }, [selectedTab]);

  const setActiveTab = (tab: SidebarTab) => {
    setSelectedTab(tab);
  };

  return (
    <aside className="right-rail" aria-label="Collaboration sidebar">
      <div className="sidebar-tabs" role="tablist" aria-label="Sidebar sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              aria-selected={selectedTab === tab.value}
              className={selectedTab === tab.value ? "sidebar-tab active" : "sidebar-tab"}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              role="tab"
              type="button"
            >
              <Icon size={16} aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      {selectedTab === "participants" ? (
        <ParticipantList currentUserId={currentUserId} participants={participants} />
      ) : null}
      {selectedTab === "chat" ? <ChatPanel messages={messages} onSendMessage={onSendMessage} /> : null}
      {selectedTab === "notes" ? <NotesPanel notes={notes} onChange={onNotesChange} /> : null}
      {selectedTab === "pages" ? (
        <section className="pages-panel" aria-label="Page thumbnails">
          <div className="participants-heading">Pages</div>
          {pages.map((page, index) => (
            <button
              className={activePageId === page.id ? "page-card active" : "page-card"}
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{page.title}</strong>
              <small>{page.boardTemplate}</small>
            </button>
          ))}
        </section>
      ) : null}
    </aside>
  );
}
