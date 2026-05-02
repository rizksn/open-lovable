import type { ReactNode } from "react";

export type ThemeMode = "dark" | "light";

export type DegreeType = "undergraduate" | "graduate" | "certificate" | "other";

export type StudentType =
  | "first-time"
  | "transfer"
  | "international"
  | "returning";

export type EnrollmentTerm = "fall-2026" | "spring-2027" | "summer-2027";

export type InputValue = string | number | boolean;

export type StudentIntakeForm = {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Academic Interest
  programOfInterest: string;
  degreeType: DegreeType;
  studentType: StudentType;

  // Timeline
  intendedStartTerm: EnrollmentTerm;

  // Additional Info
  message: string;
};

export type IntakeSubmissionStatus = "idle" | "submitting" | "success";

export type IntakeSnapshot = {
  programOfInterest: string;
  intendedStartTerm: string;
  studentType: StudentType;
  submissionStatus: IntakeSubmissionStatus;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type InputFieldProps = {
  label: string;
  name: keyof StudentIntakeForm;
  value: InputValue;
  type?: "text" | "email" | "tel" | "select" | "textarea";
  options?: SelectOption[];
  placeholder?: string;
  helperText?: string;
  onChange: (name: keyof StudentIntakeForm, value: InputValue) => void;
};

export type SectionCardProps = {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
};
