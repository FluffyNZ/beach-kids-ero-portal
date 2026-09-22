import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffById } from "@/lib/data/staff";
import { getStaffInduction } from "@/lib/data/induction";
import { InductionChecklist } from "@/components/staff/induction-checklist";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function StaffInductionPage({ params }: { params: { id: string } }) {
  const staffMember = await getStaffById(params.id);
  if (!staffMember) notFound();

  const induction = await getStaffInduction(params.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/staff" className="hover:text-charcoal">
          Staff
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <Link href={`/staff/${staffMember.id}`} className="hover:text-charcoal">
          {staffMember.full_name}
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">Induction</span>
      </nav>

      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">
          {staffMember.full_name}&apos;s Induction
        </h1>
        <p className="mt-1 text-sm text-charcoal/60">
          The digital version of the Beach Kids Induction Pack for Kaiako — every policy, form and health &amp;
          safety hazard, section by section. Progress saves as you go.
        </p>
      </div>

      <InductionChecklist
        staffId={staffMember.id}
        checkedKeys={Array.from(induction.checkedItemKeys)}
        staffSignature={{
          name: induction.staff_signature_name,
          url: induction.staff_signature_url,
          signedAt: induction.staff_signed_at,
        }}
        managerSignature={{
          name: induction.manager_signature_name,
          url: induction.manager_signature_url,
          signedAt: induction.manager_signed_at,
        }}
        completed={Boolean(induction.completed_at)}
      />
    </div>
  );
}
