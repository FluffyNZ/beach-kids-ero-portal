import { StatusBadge } from "@/components/status-badge";
import { formatShortDate, formatDateTime } from "@/lib/utils";
import type { LearningStory } from "@/lib/types";

/** How a story actually reads once it's done — full-bleed photos, generous
 * spacing, minimal chrome. This is what a family would eventually see, so
 * it deliberately doesn't look anything like a compliance form. */
export function PublishedStoryView({ story }: { story: LearningStory }) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-4xl">{story.title || "Untitled story"}</h1>
        <p className="text-sm text-charcoal/60">
          {story.children.map((c) => c.full_name).join(", ")} · {formatShortDate(story.story_date)}
          {story.author_name ? ` · ${story.author_name}` : ""}
        </p>
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {story.tags.map((t) => (
              <span key={t.id} className="badge bg-sand-100 text-charcoal/60">
                {t.name}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-6">
        {story.content_blocks.map((block) => {
          const media = (id: string | null) => story.media.find((m) => m.id === id) ?? null;

          if (block.type === "heading") {
            return block.level === 2 ? (
              <h2 key={block.id} className="font-display text-xl font-semibold text-charcoal">
                {block.text}
              </h2>
            ) : (
              <h3 key={block.id} className="font-display text-lg font-semibold text-charcoal">
                {block.text}
              </h3>
            );
          }

          if (block.type === "paragraph") {
            return (
              <div
                key={block.id}
                className="prose-story text-[15px] leading-relaxed text-charcoal/90 [&_a]:text-burgundy-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          }

          if (block.type === "image") {
            const m = media(block.mediaId);
            if (!m?.url) return null;
            return (
              <figure key={block.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.caption ?? ""} className="w-full rounded-2xl object-cover" />
                {m.caption && <figcaption className="mt-1.5 text-xs text-charcoal/50">{m.caption}</figcaption>}
              </figure>
            );
          }

          if (block.type === "image_pair") {
            const [a, b] = block.mediaIds.map(media);
            return (
              <div key={block.id} className="grid grid-cols-2 gap-3">
                {[a, b].map((m, i) =>
                  m?.url ? (
                    <figure key={i}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.caption ?? ""} className="aspect-square w-full rounded-2xl object-cover" />
                      {m.caption && <figcaption className="mt-1.5 text-xs text-charcoal/50">{m.caption}</figcaption>}
                    </figure>
                  ) : (
                    <div key={i} />
                  )
                )}
              </div>
            );
          }

          if (block.type === "video") {
            const m = media(block.mediaId);
            if (!m?.url) return null;
            return (
              <figure key={block.id}>
                <video src={m.url} controls className="w-full rounded-2xl" />
                {m.caption && <figcaption className="mt-1.5 text-xs text-charcoal/50">{m.caption}</figcaption>}
              </figure>
            );
          }

          if (block.type === "pdf") {
            const m = media(block.mediaId);
            if (!m?.url) return null;
            return (
              <a
                key={block.id}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-charcoal/10 bg-sand-50 px-4 py-3 text-sm font-medium text-burgundy-600 hover:bg-sand-100"
              >
                📄 {m.original_filename}
              </a>
            );
          }

          return null;
        })}
      </div>

      {story.published_at && (
        <footer className="border-t border-charcoal/10 pt-3 text-xs text-charcoal/40">
          Published {formatDateTime(story.published_at)}
          {story.status === "archived" && (
            <span className="ml-2">
              <StatusBadge tone="neutral">Archived</StatusBadge>
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
