import type { ReactNode } from "react";

export type ContactCategory =
  | "admissions"
  | "financial-aid"
  | "student-services"
  | "general";

export type ContactSubmissionStatus = "idle" | "submitting" | "success";

export type InputValue = string;

export type ContactForm = {
  fullName: string;
  email: string;
  category: ContactCategory;
  subject: string;
  message: string;
};

export type ContactSnapshot = {
  category: ContactCategory;
  subject: string;
  submissionStatus: ContactSubmissionStatus;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type InputFieldProps = {
  label: string;
  name: keyof ContactForm;
  value: InputValue;
  type?: "text" | "email" | "select" | "textarea";
  options?: SelectOption[];
  placeholder?: string;
  helperText?: string;
  onChange: (name: keyof ContactForm, value: InputValue) => void;
};

export type SectionCardProps = {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
};
