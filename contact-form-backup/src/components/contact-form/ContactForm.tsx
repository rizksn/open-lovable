import { InputField } from "./InputField";
import { SectionCard } from "./SectionCard";
import { useContactForm } from "./useContactForm";

const categoryOptions = [
  { label: "Admissions", value: "admissions" },
  { label: "Financial Aid", value: "financial-aid" },
  { label: "Student Services", value: "student-services" },
  { label: "General Inquiry", value: "general" },
];

export function ContactForm() {
  const {
    form,
    snapshot,
    submissionStatus,
    formattedCategory,
    handleFieldChange,
    handleSubmit,
    resetForm,
  } = useContactForm();

  const isSubmitted = submissionStatus === "success";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_35%)]" />

      <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              UNIVERSITY OF MICHIGAN
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              Contact Admissions
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400 md:text-base">
              Reach out to our team with questions, and we’ll route your inquiry
              to the appropriate department.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">
            General Inquiry
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <SectionCard
              step="01"
              title="Contact Details"
              description="Provide your basic contact information so we can respond."
            >
              <InputField
                label="Full Name"
                name="fullName"
                value={form.fullName}
                placeholder="Alex Morgan"
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
            </SectionCard>

            <SectionCard
              step="02"
              title="Inquiry Details"
              description="Tell us what you’re reaching out about."
            >
              <InputField
                label="Category"
                name="category"
                type="select"
                value={form.category}
                options={categoryOptions}
                onChange={handleFieldChange}
              />
              <InputField
                label="Subject"
                name="subject"
                value={form.subject}
                placeholder="Question about enrollment"
                onChange={handleFieldChange}
              />
              <InputField
                label="Message"
                name="message"
                type="textarea"
                value={form.message}
                placeholder="Write your message here..."
                onChange={handleFieldChange}
              />
            </SectionCard>
          </div>

          <aside className="sticky top-6 h-fit rounded-3xl border border-cyan-300/20 bg-slate-950/90 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Inquiry Snapshot
              </p>

              <div className="mt-4">
                <p className="text-sm text-slate-400">Category</p>
                <p className="mt-1 text-xl font-bold">{formattedCategory}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <SnapshotRow label="Subject" value={snapshot.subject} />
              <SnapshotRow
                label="Status"
                value={formatStatus(snapshot.submissionStatus)}
                accent={isSubmitted}
              />
            </div>

            {isSubmitted ? (
              <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                <p className="text-sm font-semibold text-emerald-100">
                  Message sent
                </p>
                <p className="mt-2 text-sm text-emerald-100/75">
                  We’ll get back to you shortly.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">
                  Ready to send?
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  This demo simulates routing your message to the correct team.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-3">
              <button
                onClick={handleSubmit}
                disabled={submissionStatus === "submitting"}
                className="h-11 rounded-2xl bg-cyan-300 text-slate-950 font-bold transition hover:bg-cyan-200 disabled:opacity-60"
              >
                {submissionStatus === "submitting"
                  ? "Sending..."
                  : isSubmitted
                    ? "Sent"
                    : "Send Message"}
              </button>

              <button
                onClick={resetForm}
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.06] text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
              >
                Reset
              </button>
            </div>
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

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    idle: "Draft",
    submitting: "Sending",
    success: "Sent",
  };
  return labels[status] ?? status;
}
