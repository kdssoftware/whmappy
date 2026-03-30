// frontend/src/components/TagManager.tsx
import React from "react";
import type { Tag, EveUser } from "../types";

interface Props {
  systemId: number;
  tags: Tag[];
  user: EveUser | null;
  onAddTag: (systemId: number, tag: string) => void;
  onDeleteTag: (tagId: number) => void;
}

export const TagManager: React.FC<Props> = ({
  systemId,
  tags,
  user,
  onAddTag,
  onDeleteTag,
}) => {
  return (
    <>
      {tags?.map((t) => (
        <div
          key={t.id}
          className="bg-slate-700 text-[10px] px-2 py-1 rounded flex items-center gap-1 border border-slate-600"
        >
          {t.tag_name}
          <button
            onClick={() => onDeleteTag(t.id)}
            className="hover:text-red-400"
          >
            ×
          </button>
        </div>
      ))}
      {(!tags || tags.length < 2) && user && (
        <input
          maxLength={255}
          className="bg-transparent border-b border-slate-600 text-[10px] w-16 px-1"
          placeholder="+ tag"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddTag(systemId, (e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      )}
    </>
  );
};
