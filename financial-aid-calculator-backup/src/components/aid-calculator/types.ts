import type { ReactNode } from "react";

export type ThemeMode = "dark" | "light";

export type StudentDependencyStatus = "dependent" | "independent";

export type EnrollmentLevel = "full-time" | "part-time";

export type SchoolType = "public-in-state" | "public-out-of-state" | "private";

export type InputValue = string | number | boolean;

export type AidCalculatorForm = {
  dependencyStatus: StudentDependencyStatus;
  enrollmentLevel: EnrollmentLevel;
  stateOfResidence: string;
  firstBachelorDegree: boolean;

  householdSize: number;
  studentsInCollege: number;
  parentMaritalStatus: string;
  studentMaritalStatus: string;

  parentIncome: number;
  parentAssets: number;
  parentTaxesPaid: number;

  studentIncome: number;
  studentAssets: number;
  studentTaxesPaid: number;

  schoolType: SchoolType;
  tuitionAndFees: number;
  housingAndFood: number;
  booksAndSupplies: number;
  transportation: number;
  personalExpenses: number;

  scholarshipsAndGrants: number;
  outsideAid: number;
};

export type AidEstimate = {
  costOfAttendance: number;
  estimatedSai: number;
  estimatedNeed: number;
  giftAidEstimate: number;
  loanEstimate: number;
  remainingGap: number;
  netCostAfterAid: number;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type InputFieldProps = {
  label: string;
  name: keyof AidCalculatorForm;
  value: InputValue;
  type?: "text" | "number" | "select" | "checkbox";
  options?: SelectOption[];
  helperText?: string;
  onChange: (name: keyof AidCalculatorForm, value: InputValue) => void;
};

export type SectionCardProps = {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
};

export type ResultPanelProps = {
  estimate: AidEstimate;
  theme: ThemeMode;
};
