"use client";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/translations";

export const ReviewGuidelinesNudge = () => {
  const { t } = useTranslation();
  
  return (
    <div className="!flex !items-center !gap-2 !text-gray-500 !text-xs !mb-3 !px-1">
      <Sparkles className="!w-3.5 !h-3.5 !text-blue-500" />
      <span className="!italic">{t.review('realExperiencesStandOut')}</span>
    </div>
  );
};
