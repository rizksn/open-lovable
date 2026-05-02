import { InputField } from "./InputField";
import { SectionCard } from "./SectionCard";
import { useStudentIntakeForm } from "./useStudentIntakeForm";

const degreeTypeOptions = [
  { label: "Undergraduate", value: "undergraduate" },
  { label: "Graduate", value: "graduate" },
  { label: "Certificate", value: "certificate" },
  { label: "Other", value: "other" },
];

const studentTypeOptions = [
  { label: "First-time student", value: "first-time" },
  { label: "Transfer student", value: "transfer" },
  { label: "International student", value: "international" },
  { label: "Returning student", value: "returning" },
];

const startTermOptions = [
  { label: "Fall 2026", value: "fall-2026" },
  { label: "Spring 2027", value: "spring-2027" },
  { label: "Summer 2027", value: "summer-2027" },
];

const programOptions = [
  { label: "Computer Science", value: "Computer Science" },
  { label: "Business Administration", value: "Business Administration" },
  { label: "Nursing", value: "Nursing" },
  { label: "Education", value: "Education" },
  { label: "Engineering", value: "Engineering" },
];

export function StudentIntakeForm() {
  const {
    form,
    snapshot,
    submissionStatus,
    handleFieldChange,
    handleSubmit,
    resetForm,
  } = useStudentIntakeForm();

  const isSubmitted = submissionStatus === "success";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_35%)]" />

      <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              OUTRIVAL TEMPLATE
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              Student Inquiry Intake
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              Capture prospective student interest, route inquiries to the right
              admissions team, and create a clear next step for follow-up.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">
            Admissions Workflow
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <SectionCard
              step="01"
              title="Student Contact"
              description="Collect the basic contact details needed for admissions follow-up."
            >
              <InputField
                label="First Name"
                name="firstName"
                value={form.firstName}
                placeholder="Alex"
                onChange={handleFieldChange}
              />
              <InputField
                label="Last Name"
                name="lastName"
                value={form.lastName}
                placeholder="Morgan"
                onChange={handleFieldChange}
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                placeholder="alex@example.com"
                onChange={handleFieldChange}
              />
              <InputField
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                placeholder="(555) 123-4567"
                onChange={handleFieldChange}
              />
            </SectionCard>

            <SectionCard
              step="02"
              title="Academic Interest"
              description="Understand what the student wants to study and how they plan to enroll."
            >
              <InputField
                label="Program of Interest"
                name="programOfInterest"
                type="select"
                value={form.programOfInterest}
                options={programOptions}
                onChange={handleFieldChange}
              />
              <InputField
                label="Degree Type"
                name="degreeType"
                type="select"
                value={form.degreeType}
                options={degreeTypeOptions}
                onChange={handleFieldChange}
              />
              <InputField
                label="Student Type"
                name="studentType"
                type="select"
                value={form.studentType}
                options={studentTypeOptions}
                onChange={handleFieldChange}
              />
              <InputField
                label="Intended Start Term"
                name="intendedStartTerm"
                type="select"
                value={form.intendedStartTerm}
                options={startTermOptions}
                onChange={handleFieldChange}
              />
            </SectionCard>

            <SectionCard
              step="03"
              title="Additional Context"
              description="Give the student space to share goals, questions, or support needs."
            >
              <InputField
                label="Message"
                name="message"
                type="textarea"
                value={form.message}
                placeholder="Tell us what you’re interested in or what questions you have."
                helperText="This can help route the inquiry to the right admissions counselor."
                onChange={handleFieldChange}
              />
            </SectionCard>
          </div>

          <aside className="sticky top-6 h-fit rounded-3xl border border-cyan-300/20 bg-slate-950/90 p-5 text-white shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Application Snapshot
              </p>

              <div className="mt-4">
                <p className="text-sm text-slate-400">Program Interest</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {snapshot.programOfInterest}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <SnapshotRow
                label="Start Term"
                value={snapshot.intendedStartTerm}
              />
              <SnapshotRow
                label="Student Type"
                value={formatStudentType(snapshot.studentType)}
              />
              <SnapshotRow
                label="Status"
                value={formatSubmissionStatus(snapshot.submissionStatus)}
                accent={isSubmitted}
              />
            </div>

            {isSubmitted ? (
              <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                <p className="text-sm font-semibold text-emerald-100">
                  Inquiry submitted
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/75">
                  Thanks — an admissions counselor will follow up with next
                  steps.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">
                  Ready to submit?
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This demo simulates routing the inquiry to the admissions
                  team.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submissionStatus === "submitting"}
                className="h-11 rounded-2xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submissionStatus === "submitting"
                  ? "Submitting..."
                  : isSubmitted
                    ? "Submitted"
                    : "Submit Inquiry"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
              >
                Reset Form
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Demo submission only. In production, this would create an
              admissions inquiry record or route to a CRM.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={
          accent
            ? "text-sm font-semibold text-emerald-200"
            : "text-sm font-semibold text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatStudentType(studentType: string) {
  const labels: Record<string, string> = {
    "first-time": "First-time",
    transfer: "Transfer",
    international: "International",
    returning: "Returning",
  };

  return labels[studentType] ?? studentType;
}

function formatSubmissionStatus(status: string) {
  const labels: Record<string, string> = {
    idle: "Draft",
    submitting: "Submitting",
    success: "Submitted",
  };

  return labels[status] ?? status;
}
