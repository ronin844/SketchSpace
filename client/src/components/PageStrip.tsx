import { FilePlus2 } from "lucide-react";
import type { BoardPage } from "../types";

type PageStripProps = {
  activePageId: string;
  pages: BoardPage[];
  onAddPage: () => void;
  onSelectPage: (pageId: string) => void;
};

export function PageStrip({ activePageId, pages, onAddPage, onSelectPage }: PageStripProps) {
  return (
    <nav className="page-strip" aria-label="Board pages">
      <div className="page-tabs">
        {pages.map((page, index) => (
          <button
            aria-current={activePageId === page.id ? "page" : undefined}
            className={activePageId === page.id ? "page-tab active" : "page-tab"}
            key={page.id}
            onClick={() => onSelectPage(page.id)}
            title={page.title}
            type="button"
          >
            <span>{index + 1}</span>
            {page.title}
          </button>
        ))}
      </div>
      <button className="add-page-button" onClick={onAddPage} title="Add page" type="button">
        <FilePlus2 size={17} aria-hidden />
        Add page
      </button>
    </nav>
  );
}
