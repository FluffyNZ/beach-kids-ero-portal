import { FinancePage, FigureStrip } from "@/components/finances/finance-page";
import { FamilyAccountsList, type FamilyFilter } from "@/components/finances/family-accounts-list";
import { AddFamilyAccountButton } from "@/components/finances/family-account-forms";
import { getFamilyAccounts } from "@/lib/data/finance-hub";
import { fmtDate } from "@/lib/finance-format";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: FamilyFilter[] = ["enrolled", "balance", "overdue", "no_email", "all"];

export default async function FamilyAccountsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const { today, rows } = await getFamilyAccounts();
  const enrolled = rows.filter((r) => r.children.length > 0);
  const outstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const overdue = rows.reduce((s, r) => s + r.overdue, 0);
  const noEmail = enrolled.filter((r) => !r.email).length;
  const initialFilter = FILTERS.includes(searchParams.filter as FamilyFilter) ? (searchParams.filter as FamilyFilter) : "enrolled";

  return (
    <FinancePage
      title="Family accounts"
      description="Who pays for each child, their contact details and what they owe."
      actions={<AddFamilyAccountButton />}
    >
      <FigureStrip
        figures={[
          { label: "With enrolled children", value: enrolled.length, scope: `${rows.length} family accounts on file` },
          { label: "Outstanding", value: formatCurrency(outstanding), scope: `All family accounts, as of ${fmtDate(today)}` },
          { label: "Overdue", value: formatCurrency(overdue), scope: "Part of outstanding", emphasis: overdue > 0 ? "action" : undefined },
          { label: "No email on file", value: noEmail, scope: "Family accounts with enrolled children", emphasis: noEmail > 0 ? "attention" : undefined },
        ]}
      />
      <FamilyAccountsList rows={rows} initialFilter={initialFilter} />
    </FinancePage>
  );
}
