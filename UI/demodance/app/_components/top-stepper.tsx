"use client";

import Link from "next/link";

export type TopStepId = 1 | 2 | 3;

type TopStepperProps = {
  activeStep: TopStepId;
};

const steps = [
  { id: 1 as const, en: "Onboarding", zh: "入门", href: "/onboarding" },
  { id: 2 as const, en: "Script & Collaborate", zh: "脚本与协作", href: "/workflow" },
  { id: 3 as const, en: "Generate & Export", zh: "生成与导出", href: "/generate" },
];

export function TopStepper({ activeStep }: TopStepperProps) {
  return (
    <div className="dd-top-stepper">
      {steps.map((step, index) => (
        <div key={step.id} className="dd-step-wrap">
          <Link href={step.href} className={`dd-top-step ${step.id === activeStep ? "active" : ""}`}>
            <span className="dd-top-step-index">{step.id}</span>
            <span className="leading-tight">
              <span className="dd-label-en">{step.en}</span>
              <span className="dd-label-zh">{step.zh}</span>
            </span>
          </Link>
          {index < steps.length - 1 && (
            <span className={`dd-top-step-connector ${activeStep > step.id ? "active" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}
