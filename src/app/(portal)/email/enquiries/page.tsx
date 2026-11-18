import { EmailPage } from "@/components/email/email-page";
import { EnquiryList } from "@/components/email/enquiry-list";
import { NewEnquiryButton } from "@/components/email/new-enquiry-button";
import { getEnquiriesWithActivity } from "@/lib/data/email-hub";
import { getRosterRooms } from "@/lib/data/roster";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({ searchParams }: { searchParams: { open?: string } }) {
  const [enquiries, rooms] = await Promise.all([getEnquiriesWithActivity(), getRosterRooms()]);
  return (
    <EmailPage
      title="Enquiries"
      description="Families who've asked about a place. Reply, follow up, then mark them converted or dismissed."
      actions={<NewEnquiryButton rooms={rooms} />}
    >
      <EnquiryList enquiries={enquiries} initialOpen={searchParams.open ?? null} />
    </EmailPage>
  );
}
