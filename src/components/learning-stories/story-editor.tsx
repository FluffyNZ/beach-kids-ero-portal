"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import { ChildPicker } from "./child-picker";
import { TagPicker } from "./tag-picker";
import { MediaManager } from "./media-manager";
import { BlockEditor } from "./block-editor";
import { WritingPromptsPanel } from "./writing-prompts-panel";
import { HelpMeWritePanel } from "./help-me-write-panel";
import { StatusActions } from "./status-actions";
import { AuditHistoryPanel } from "./audit-history-panel";
import { PublishedStoryView } from "./published-story-view";
import { autosaveStory, setStoryChildren, setStoryTags } from "@/lib/actions/learning-stories";
import { LEARNING_STORY_STATUS_LABEL, learningStoryStatusTone } from "@/lib/constants";
import { formatDateTime, randomId } from "@/lib/utils";
import type { LearningStory, LearningStoryBlock, LearningStoryMedia } from "@/lib/types";
import type { ChildMember, RosterRoom, LearningTagSet, StaffMember } from "@/lib/types";

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function StoryEditor({
  story,
  allChildren,
  rooms,
  tagSets,
  authors,
}: {
  story: LearningStory;
  allChildren: ChildMember[];
  rooms: RosterRoom[];
  tagSets: LearningTagSet[];
  authors: StaffMember[];
}) {
  const isEditable = story.status === "draft" || story.status === "returned_for_editing" || story.status === "awaiting_approval";

  const [title, setTitle] = useState(story.title);
  const [storyDate, setStoryDate] = useState(story.story_date);
  const [authorId, setAuthorId] = useState(story.author_staff_id ?? "");
  const [blocks, setBlocks] = useState<LearningStoryBlock[]>(story.content_blocks);
  const [media, setMedia] = useState<LearningStoryMedia[]>(story.media);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(story.children.map((c) => c.id));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(story.tags.map((t) => t.id));
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(story.last_autosaved_at);
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isEditable) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSaving(true);
      autosaveStory(story.id, { title, story_date: storyDate, author_staff_id: authorId || null, content_blocks: blocks }).then(
        (result) => {
          setSaving(false);
          if (result.success) setLastSavedAt(result.savedAt);
        }
      );
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, storyDate, authorId, blocks]);

  function handleChildrenChange(ids: string[]) {
    setSelectedChildIds(ids);
    setStoryChildren(story.id, ids);
  }

  function handleTagsChange(ids: string[]) {
    setSelectedTagIds(ids);
    setStoryTags(story.id, ids);
  }

  function insertParagraph(html: string) {
    setBlocks((prev) => [...prev, { id: randomId(), type: "paragraph", html }]);
  }

  const selectedAuthor = authors.find((a) => a.id === authorId);
  const canPublishDirectly = Boolean(selectedAuthor?.can_publish_learning_stories);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/learning/stories" className="hover:text-charcoal">
          Learning Stories
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">{story.story_number}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold text-charcoal">{story.title || "Untitled story"}</h1>
          <StatusBadge tone={learningStoryStatusTone(story.status)}>{LEARNING_STORY_STATUS_LABEL[story.status]}</StatusBadge>
        </div>
        {isEditable && (
          <p className="text-xs text-charcoal/40">
            {saving ? "Saving…" : lastSavedAt ? `Last saved ${formatDateTime(lastSavedAt)}` : "Not saved yet"}
          </p>
        )}
      </div>

      {!isEditable ? (
        <>
          <section className="card p-6 md:p-8">
            <PublishedStoryView story={{ ...story, title, story_date: storyDate, content_blocks: blocks, media }} />
          </section>
          <section className="card p-5">
            <StatusActions storyId={story.id} status={story.status} canPublishDirectly={canPublishDirectly} reviewComments={story.review_comments} />
            <AuditHistoryPanel history={story.status_history} />
          </section>
        </>
      ) : (
        <>
          <section className="card flex flex-col gap-4 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Story details</h2>
            <div>
              <label className="label">Story ID</label>
              <input className="input bg-sand-50" value={story.story_number} disabled />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Story date</label>
                <input type="date" className="input" value={storyDate} onChange={(e) => setStoryDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Author</label>
                <select className="input" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
                  <option value="">Select an author…</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Title</label>
              <input type="text" className="input" placeholder="e.g. Exploring the Mud Kitchen" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Children in this story</h2>
            <ChildPicker allChildren={allChildren} rooms={rooms} selectedIds={selectedChildIds} onChange={handleChildrenChange} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Photos, video &amp; files</h2>
            <MediaManager storyId={story.id} media={media} onChange={setMedia} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Story</h2>
            <div className="mb-4">
              <WritingPromptsPanel />
            </div>
            <div className="mb-4">
              <HelpMeWritePanel onInsertParagraph={insertParagraph} />
            </div>
            <BlockEditor blocks={blocks} media={media} onChange={setBlocks} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Learning tags &amp; Te Whāriki</h2>
            <TagPicker tagSets={tagSets} selectedTagIds={selectedTagIds} onChange={handleTagsChange} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Status</h2>
            <StatusActions storyId={story.id} status={story.status} canPublishDirectly={canPublishDirectly} reviewComments={story.review_comments} />
            <AuditHistoryPanel history={story.status_history} />
          </section>
        </>
      )}
    </div>
  );
}
