import { EmailPage } from "@/components/email/email-page";
import { TemplateLibrary } from "@/components/email/template-library";
import { getEmailTemplates } from "@/lib/data/email";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  const templates = await getEmailTemplates();
  return (
    <EmailPage title="Templates" description="Ready-made emails for common messages to families. Preview one, then use it to start an email.">
      <TemplateLibrary templates={templates} />
    </EmailPage>
  );
}
