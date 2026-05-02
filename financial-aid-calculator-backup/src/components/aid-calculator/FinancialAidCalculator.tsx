import { InputField } from "./InputField";
import { ResultPanel } from "./ResultPanel";
import { SectionCard } from "./SectionCard";
import { useAidCalculator } from "./useAidCalculator";

const dependencyOptions = [
  { label: "Dependent student", value: "dependent" },
  { label: "Independent student", value: "independent" },
];

const enrollmentOptions = [
  { label: "Full-time", value: "full-time" },
  { label: "Part-time", value: "part-time" },
];

const schoolTypeOptions = [
  { label: "Public in-state", value: "public-in-state" },
  { label: "Public out-of-state", value: "public-out-of-state" },
  { label: "Private institution", value: "private" },
];

const maritalStatusOptions = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Separated", value: "separated" },
];

export function FinancialAidCalculator() {
  const { form, estimate, theme, handleFieldChange, toggleTheme } =
    useAidCalculator();

  const isDependent = form.dependencyStatus === "dependent";

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
              Financial Aid Estimator
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              Help students preview affordability, understand estimated aid, and
              compare their remaining cost before starting a formal aid
              application.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <SectionCard
              step="01"
              title="Student Profile"
              description="Start with the student's basic enrollment and eligibility context."
            >
              <InputField
                label="Dependency Status"
                name="dependencyStatus"
                type="select"
                value={form.dependencyStatus}
                options={dependencyOptions}
                onChange={handleFieldChange}
              />
              <InputField
                label="Enrollment Level"
                name="enrollmentLevel"
                type="select"
                value={form.enrollmentLevel}
                options={enrollmentOptions}
                onChange={handleFieldChange}
              />
              <InputField
                label="State of Residence"
                name="stateOfResidence"
                value={form.stateOfResidence}
                onChange={handleFieldChange}
              />
              <InputField
                label="First Bachelor’s Degree"
                name="firstBachelorDegree"
                type="checkbox"
                value={form.firstBachelorDegree}
                helperText="Used for a simplified undergraduate eligibility signal."
                onChange={handleFieldChange}
              />
            </SectionCard>

            <SectionCard
              step="02"
              title="Household"
              description="Capture family size and household context that influence the estimate."
            >
              <InputField
                label="Household Size"
                name="householdSize"
                type="number"
                value={form.householdSize}
                onChange={handleFieldChange}
              />
              <InputField
                label="Students in College"
                name="studentsInCollege"
                type="number"
                value={form.studentsInCollege}
                onChange={handleFieldChange}
              />
              <InputField
                label="Student Marital Status"
                name="studentMaritalStatus"
                type="select"
                value={form.studentMaritalStatus}
                options={maritalStatusOptions}
                onChange={handleFieldChange}
              />
              {isDependent ? (
                <InputField
                  label="Parent Marital Status"
                  name="parentMaritalStatus"
                  type="select"
                  value={form.parentMaritalStatus}
                  options={maritalStatusOptions}
                  onChange={handleFieldChange}
                />
              ) : null}
            </SectionCard>

            {isDependent ? (
              <SectionCard
                step="03"
                title="Parent Financials"
                description="Estimate parent contribution using simplified income, asset, and tax inputs."
              >
                <InputField
                  label="Parent Income"
                  name="parentIncome"
                  type="number"
                  value={form.parentIncome}
                  onChange={handleFieldChange}
                />
                <InputField
                  label="Parent Assets"
                  name="parentAssets"
                  type="number"
                  value={form.parentAssets}
                  onChange={handleFieldChange}
                />
                <InputField
                  label="Parent Taxes Paid"
                  name="parentTaxesPaid"
                  type="number"
                  value={form.parentTaxesPaid}
                  onChange={handleFieldChange}
                />
              </SectionCard>
            ) : null}

            <SectionCard
              step={isDependent ? "04" : "03"}
              title="Student Financials"
              description="Include the student's own income, savings, and tax context."
            >
              <InputField
                label="Student Income"
                name="studentIncome"
                type="number"
                value={form.studentIncome}
                onChange={handleFieldChange}
              />
              <InputField
                label="Student Assets"
                name="studentAssets"
                type="number"
                value={form.studentAssets}
                onChange={handleFieldChange}
              />
              <InputField
                label="Student Taxes Paid"
                name="studentTaxesPaid"
                type="number"
                value={form.studentTaxesPaid}
                onChange={handleFieldChange}
              />
            </SectionCard>

            <SectionCard
              step={isDependent ? "05" : "04"}
              title="School Costs"
              description="Build a simplified cost of attendance from direct and indirect expenses."
            >
              <InputField
                label="School Type"
                name="schoolType"
                type="select"
                value={form.schoolType}
                options={schoolTypeOptions}
                onChange={handleFieldChange}
              />
              <InputField
                label="Tuition and Fees"
                name="tuitionAndFees"
                type="number"
                value={form.tuitionAndFees}
                onChange={handleFieldChange}
              />
              <InputField
                label="Housing and Food"
                name="housingAndFood"
                type="number"
                value={form.housingAndFood}
                onChange={handleFieldChange}
              />
              <InputField
                label="Books and Supplies"
                name="booksAndSupplies"
                type="number"
                value={form.booksAndSupplies}
                onChange={handleFieldChange}
              />
              <InputField
                label="Transportation"
                name="transportation"
                type="number"
                value={form.transportation}
                onChange={handleFieldChange}
              />
              <InputField
                label="Personal Expenses"
                name="personalExpenses"
                type="number"
                value={form.personalExpenses}
                onChange={handleFieldChange}
              />
            </SectionCard>

            <SectionCard
              step={isDependent ? "06" : "05"}
              title="Existing Aid"
              description="Account for known scholarships, grants, and outside awards."
            >
              <InputField
                label="Scholarships and Grants"
                name="scholarshipsAndGrants"
                type="number"
                value={form.scholarshipsAndGrants}
                onChange={handleFieldChange}
              />
              <InputField
                label="Outside Aid"
                name="outsideAid"
                type="number"
                value={form.outsideAid}
                onChange={handleFieldChange}
              />
            </SectionCard>
          </div>

          <ResultPanel estimate={estimate} theme={theme} />
        </div>
      </main>
    </div>
  );
}
