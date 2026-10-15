import Link from "next/link";
import { CreditCardIcon, DocumentIcon, MailIcon, AlertIcon } from "@/components/icons";
import { ChevronRightIcon } from "@/components/icons";

/** Every link here points at a page/workflow that already exists and
 * already does the thing it says — nothing here is a placeholder:
 *  - Record payment → Invoices filtered to Unpaid, where opening an
 *    invoice shows the real "Record payment" button (markInvoicePaid).
 *  - Create invoice → Fees, the only place invoices are actually drafted
 *    from (DraftInvoiceButton, one real week's numbers, never freehand).
 *  - Generate statement → Statements, where each family with a balance
 *    has a real "Send statement" button.
 *  - Review overdue fees → Invoices filtered to Overdue. */
const ACTIONS = [
  {
    label: "Record payment",
    description: "Mark an unpaid invoice as paid",
    href: "/finances/invoices?status=unpaid",
    icon: CreditCardIcon,
  },
  {
    label: "Create invoice",
    description: "Draft from this week's fees",
    href: "/finances/fees",
    icon: DocumentIcon,
  },
  {
    label: "Generate statement",
    description: "Email a family what they owe",
    href: "/finances/statements",
    icon: MailIcon,
  },
  {
    label: "Review overdue fees",
    description: "Invoices past their due date",
    href: "/finances/invoices?status=overdue",
    icon: AlertIcon,
  },
] as const;

export function FinanceQuickActions() {
  return (
    <section className="card flex h-full flex-col gap-1 p-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Quick actions</h2>
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-charcoal/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/60">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-charcoal">{action.label}</span>
              <span className="block truncate text-xs text-charcoal/45">{action.description}</span>
            </span>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-charcoal/20 transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </section>
  );
}
