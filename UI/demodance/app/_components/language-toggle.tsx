"use client";

import { useLocale } from "../locale-provider";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="dd-lang-toggle" role="group" aria-label="Language toggle">
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === "zh" ? "active" : ""}
        onClick={() => setLocale("zh")}
      >
        中文
      </button>
    </div>
  );
}
