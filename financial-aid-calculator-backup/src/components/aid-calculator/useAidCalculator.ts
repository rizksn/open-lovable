import { useMemo, useState } from "react";
import type { AidCalculatorForm, AidEstimate, InputValue } from "./types";

const initialForm: AidCalculatorForm = {
  dependencyStatus: "dependent",
  enrollmentLevel: "full-time",
  stateOfResidence: "Michigan",
  firstBachelorDegree: true,

  householdSize: 4,
  studentsInCollege: 1,
  parentMaritalStatus: "married",
  studentMaritalStatus: "single",

  parentIncome: 85000,
  parentAssets: 12000,
  parentTaxesPaid: 9000,

  studentIncome: 4500,
  studentAssets: 1200,
  studentTaxesPaid: 300,

  schoolType: "public-in-state",
  tuitionAndFees: 16500,
  housingAndFood: 13500,
  booksAndSupplies: 1200,
  transportation: 1800,
  personalExpenses: 2200,

  scholarshipsAndGrants: 3500,
  outsideAid: 1000,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function calculateEstimate(form: AidCalculatorForm): AidEstimate {
  const costOfAttendance =
    form.tuitionAndFees +
    form.housingAndFood +
    form.booksAndSupplies +
    form.transportation +
    form.personalExpenses;

  const parentContribution =
    form.dependencyStatus === "dependent"
      ? form.parentIncome * 0.13 +
        form.parentAssets * 0.04 -
        form.parentTaxesPaid * 0.18
      : 0;

  const studentContribution =
    form.studentIncome * 0.18 +
    form.studentAssets * 0.12 -
    form.studentTaxesPaid * 0.1;

  const householdAdjustment =
    form.householdSize > 1 ? (form.householdSize - 1) * 900 : 0;

  const collegeAdjustment =
    form.studentsInCollege > 1 ? (form.studentsInCollege - 1) * 2500 : 0;

  const estimatedSai = Math.round(
    clamp(
      parentContribution +
        studentContribution -
        householdAdjustment -
        collegeAdjustment,
      0,
      costOfAttendance,
    ),
  );

  const estimatedNeed = Math.max(costOfAttendance - estimatedSai, 0);

  const giftAidEstimate = Math.round(
    clamp(estimatedNeed * 0.42, 0, estimatedNeed),
  );

  const loanEstimate = Math.round(
    clamp(estimatedNeed * 0.22, 0, estimatedNeed - giftAidEstimate),
  );

  const existingAid = form.scholarshipsAndGrants + form.outsideAid;

  const netCostAfterAid = Math.max(
    costOfAttendance - giftAidEstimate - existingAid,
    0,
  );

  const remainingGap = Math.max(
    costOfAttendance - giftAidEstimate - loanEstimate - existingAid,
    0,
  );

  return {
    costOfAttendance,
    estimatedSai,
    estimatedNeed,
    giftAidEstimate,
    loanEstimate,
    remainingGap,
    netCostAfterAid,
  };
}

export function useAidCalculator() {
  const [form, setForm] = useState<AidCalculatorForm>(initialForm);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const estimate = useMemo(() => calculateEstimate(form), [form]);

  function handleFieldChange(name: keyof AidCalculatorForm, value: InputValue) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return {
    form,
    estimate,
    theme,
    handleFieldChange,
    toggleTheme,
  };
}
