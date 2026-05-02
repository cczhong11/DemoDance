"use client";

import { useRouter } from "next/navigation";

import { useWorkflowStore } from "../_state/workflow-store";

export function NewProjectButton() {
  const router = useRouter();
  const { resetAll } = useWorkflowStore();

  function handleClick() {
    resetAll();
    router.push("/onboarding");
  }

  return (
    <button type="button" className="dd-btn-primary h-11 px-6" onClick={handleClick}>
      New Project
    </button>
  );
}
