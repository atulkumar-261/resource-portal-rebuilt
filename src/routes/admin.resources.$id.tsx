import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/resources/$id")({ component: ResourceDetail });

function ResourceDetail() {
  const { id } = Route.useParams();
  const r = useRMS((s) => s.resources.find((x) => x.id === id));
  if (!r) return <PageCard title="Resource"><p>Not found.</p></PageCard>;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="grid grid-cols-3 gap-3 py-1.5 border-b border-slate-100 text-sm"><dt className="text-slate-500 col-span-1">{label}</dt><dd className="col-span-2 font-medium text-slate-800">{value || <span className="text-slate-400">—</span>}</dd></div>
  );
  return (
    <PageCard title={`Resource Profile — ${r.fullName}`}>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center">{r.fullName.charAt(0)}</div>
            <div><div className="text-lg font-semibold">{r.fullName}</div><div className="text-sm text-slate-500">{r.jobTitle}</div><div className="text-xs text-slate-500">Employee ID: {r.employeeId}</div></div>
          </div>
          <Row label="Email" value={r.email} />
          <Row label="Skillset" value={r.skillset} />
          <Row label="Contact Phone" value={r.phone} />
          <Row label="Contact Address" value={r.address} />
          <Row label="Citizen of" value={r.citizenOf} />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Personal Details</h3>
          <Row label="Date of Birth" value={r.dob} />
          <Row label="Passport Number" value={r.passportNumber} />
          <Row label="Passport Expiry" value={r.passportExpiry} />
          <Row label="Visa Number" value={r.visaNumber} />
          <Row label="Visa Expiry" value={r.visaExpiry} />
          <Row label="NI Number" value={r.niNumber} />
          <h3 className="font-semibold mt-4 mb-2">Bank Details</h3>
          <Row label="Account No." value={r.bankAccount} />
          <Row label="Sort Code" value={r.sortCode} />
          <Row label="Bank Name" value={r.bankName} />
          <h3 className="font-semibold mt-4 mb-2">Emergency Contact</h3>
          <Row label="Contact Person" value={r.emergencyName} />
          <Row label="Phone" value={r.emergencyPhone} />
          <Row label="Email" value={r.emergencyEmail} />
          <Row label="Address" value={r.emergencyAddress} />
          <h3 className="font-semibold mt-4 mb-2">Documents</h3>
          <p className="text-xs text-slate-500">CV: Not uploaded · Passport Copy: Not uploaded · Visa Copy: Not uploaded · Holiday Sheet: Not uploaded · Other Documents: Not uploaded</p>
        </div>
      </div>
    </PageCard>
  );
}
