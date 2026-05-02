import { useMemo, useState } from "react";
import type {
  ContactForm,
  ContactSnapshot,
  ContactSubmissionStatus,
  InputValue,
} from "./types";

const initialForm: ContactForm = {
  fullName: "",
  email: "",
  category: "admissions",
  subject: "",
  message: "",
};

function formatCategory(category: ContactForm["category"]) {
  const labels: Record<ContactForm["category"], string> = {
    admissions: "Admissions",
    "financial-aid": "Financial Aid",
    "student-services": "Student Services",
    general: "General Inquiry",
  };

  return labels[category];
}

export function useContactForm() {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [submissionStatus, setSubmissionStatus] =
    useState<ContactSubmissionStatus>("idle");

  const snapshot = useMemo<ContactSnapshot>(
    () => ({
      category: form.category,
      subject: form.subject || "No subject yet",
      submissionStatus,
    }),
    [form.category, form.subject, submissionStatus],
  );

  function handleFieldChange(name: keyof ContactForm, value: InputValue) {
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
    formattedCategory: formatCategory(snapshot.category),
    handleFieldChange,
    handleSubmit,
    resetForm,
  };
}
