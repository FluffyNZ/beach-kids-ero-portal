import { notFound } from "next/navigation";
import { getLearningStoryById } from "@/lib/data/learning-stories";
import { getLearningTagSets } from "@/lib/data/learning-tags";
import { getChildrenList } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { getStaffList } from "@/lib/data/staff";
import { StoryEditor } from "@/components/learning-stories/story-editor";

export const dynamic = "force-dynamic";

export default async function LearningStoryDetailPage({ params }: { params: { id: string } }) {
  const [story, allChildren, rooms, tagSets, authors] = await Promise.all([
    getLearningStoryById(params.id),
    getChildrenList(),
    getRosterRooms(),
    getLearningTagSets(),
    getStaffList({ status: "active" }),
  ]);

  if (!story) notFound();

  return <StoryEditor story={story} allChildren={allChildren} rooms={rooms} tagSets={tagSets} authors={authors} />;
}
