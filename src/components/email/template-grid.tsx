import Link from "next/link";
import type { EmailTemplate } from "@/lib/types";
import { TemplateIcon } from "@/components/email/template-icon";
import { EditTemplateButton } from "@/components/email/edit-template-button";
import { EMAIL_TEMPLATE_CATEGORIES, EMAIL_TEMPLATE_CATEGORY_LABEL } from "@/lib/constants";

/** Every active template (see src/lib/data/email.ts's getEmailTemplates),
 * grouped into the 4 categories from migration 0050, in the fixed order
 * EMAIL_TEMPLATE_CATEGORIES lists them — not alphabetical, so "Enquiries &
 * Enrolment" (the ones a brand-new family is most likely to need) leads.
 * Clicking a card starts the compose wizard already pointed at that
 * template; which child/recipient it's for is still to be chosen there. */
export function TemplateGrid({ templates, childId }: { templates: EmailTemplate[]; childId?: string }) {
  return (
    <div className="flex flex-col gap-6">
      {EMAIL_TEMPLATE_CATEGORIES.map((category) => {
        const items = templates.filter((t) => t.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              {EMAIL_TEMPLATE_CATEGORY_LABEL[category]}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((t) => (
                <div key={t.key} className="card group relative p-4 transition-colors hover:border-charcoal/20 hover:shadow-cardHover">
                  <EditTemplateButton template={t} />
                  <Link
                    href={`/email/compose?template=${t.key}${childId ? `&childId=${childId}` : ""}`}
                    className="flex flex-col items-start gap-2"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lilac-100 text-charcoal/70">
                      <TemplateIcon icon={t.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="text-sm font-medium leading-snug text-charcoal">{t.label}</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
