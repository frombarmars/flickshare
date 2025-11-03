"use client";
import { X, AlertCircle } from "lucide-react";
import { useTranslation } from "@/translations";

interface ReviewGuidelinesBannerProps {
  onDismiss: () => void;
}

export const ReviewGuidelinesBanner = ({ onDismiss }: ReviewGuidelinesBannerProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="!bg-yellow-50 !border-2 !border-yellow-200 !rounded-2xl !p-4 !mb-4 !shadow-sm">
      <div className="!flex !items-start !gap-3">
        <AlertCircle className="!w-5 !h-5 !text-yellow-600 !flex-shrink-0 !mt-0.5" />
        <div className="!flex-1">
          <p className="!text-sm !font-semibold !text-yellow-900 !mb-1">
            {t.review('keepItReal')}
          </p>
          <p className="!text-xs !text-yellow-700">
            {t.review('keepItRealDesc')}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="!flex-shrink-0 !w-6 !h-6 !flex !items-center !justify-center 
                     !rounded-full hover:!bg-yellow-100 !transition-colors active:!scale-95"
          aria-label={t.review('dismiss')}
        >
          <X className="!w-4 !h-4 !text-yellow-600" />
        </button>
      </div>
    </div>
  );
};
