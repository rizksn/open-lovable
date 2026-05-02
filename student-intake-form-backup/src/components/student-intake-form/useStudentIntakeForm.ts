import { useMemo, useState } from "react";
import type {
  InputValue,
  IntakeSnapshot,
  IntakeSubmissionStatus,
  StudentIntakeForm,
} from "./types";

const initialForm: StudentIntakeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",

  programOfInterest: "Computer Science",
  degreeType: "undergraduate",
  studentType: "first-time",

  intendedStartTerm: "fall-2026",

  message: "",
};

function formatTerm(term: StudentIntakeForm["intendedStartTerm"]) {
  const labels: Record<StudentIntakeForm["intendedStartTerm"], string> = {
    "fall-2026": "Fall 2026",
    "spring-2027": "Spring 2027",
    "summer-2027": "Summer 2027",
  };

  return labels[term];
}

export function useStudentIntakeForm() {
  const [form, setForm] = useState<StudentIntakeForm>(initialForm);
  const [submissionStatus, setSubmissionStatus] =
    useState<IntakeSubmissionStatus>("idle");

  const snapshot = useMemo<IntakeSnapshot>(
    () => ({
      programOfInterest: form.programOfInterest,
      intendedStartTerm: formatTerm(form.intendedStartTerm),
      studentType: form.studentType,
      submissionStatus,
    }),
    [
      form.programOfInterest,
      form.intendedStartTerm,
      form.studentType,
      submissionStatus,
    ],
  );

  function handleFieldChange(name: keyof StudentIntakeForm, value: InputValue) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (submissionStatus === "success") {
      setSubmissionStatus("idle");
    }
  }

  function handleSubmit() {
    setSubmissionStatus("submitting");

    window.setTimeout(() => {
      setSubmissionStatus("success");
    }, 500);
  }

  function resetForm() {
    setForm(initialForm);
    setSubmissionStatus("idle");
  }

  return {
    form,
    snapshot,
    submissionStatus,
    handleFieldChange,
    handleSubmit,
    resetForm,
  };
}
