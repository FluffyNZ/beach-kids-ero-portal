import Link from "next/link";
import { EmailNav } from "@/components/email/email-nav";
import { PageHeader } from "@/components/ui/page-header";

/** The shared frame for Email pages: section navigation, then the page
 * title and description with the Compose email button. */
export function EmailPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 [contain:inline-size]">
      <EmailNav />
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {actions}
            <Link href="/email/compose" className="btn-primary">
              Compose email
            </Link>
          </>
        }
      />
      {children}
    </div>
  );
}
