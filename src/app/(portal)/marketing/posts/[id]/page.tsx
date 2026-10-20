import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketingPostById, getMarketingConnections } from "@/lib/data/marketing";
import { CreatePostForm } from "@/components/marketing/create-post-form";

export const dynamic = "force-dynamic";

export default async function MarketingPostPage({ params }: { params: { id: string } }) {
  const [post, connections] = await Promise.all([getMarketingPostById(params.id), getMarketingConnections()]);
  if (!post) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">
            {post.status === "draft" ? "Edit draft" : "Post"}
          </h1>
          <p className="mt-1 text-sm text-charcoal/60">Upload media, write your caption, and schedule or publish when ready.</p>
        </div>
        <Link href="/marketing" className="btn-ghost">
          Back to Marketing
        </Link>
      </div>

      <CreatePostForm post={post} connections={connections} />
    </div>
  );
}
