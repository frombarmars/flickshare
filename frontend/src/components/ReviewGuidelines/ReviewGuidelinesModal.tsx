"use client";
import { useState } from "react";
import { X, CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";
import { useTranslation } from "@/translations";

interface ReviewGuidelinesModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const ReviewGuidelinesModal = ({ onClose, onConfirm }: ReviewGuidelinesModalProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: t.review('writeYourOwnThoughts'),
      icon: <CheckCircle className="!w-8 !h-8 !text-green-500" />,
      description: t.review('writeYourOwnThoughtsDesc'),
      examples: [
        { type: "good", text: t.review('exampleGood1') },
        { type: "bad", text: t.review('exampleBad1') },
      ],
    },
    {
      title: t.review('beSpecificAndDetailed'),
      icon: <Shield className="!w-8 !h-8 !text-blue-500" />,
      description: t.review('beSpecificAndDetailedDesc'),
      examples: [
        { type: "good", text: t.review('exampleGood2') },
        { type: "bad", text: t.review('exampleBad2') },
      ],
    },
    {
      title: t.review('spamEqualsBan'),
      icon: <XCircle className="!w-8 !h-8 !text-red-500" />,
      description: t.review('spamEqualsBanDesc'),
      examples: [
        { type: "bad", text: t.review('exampleBad3') },
        { type: "bad", text: t.review('exampleBad4') },
      ],
    },
    {
      title: t.review('goodReviewsEqualRewards'),
      icon: <AlertTriangle className="!w-8 !h-8 !text-yellow-500" />,
      description: t.review('goodReviewsEqualRewardsDesc'),
      examples: [
        { type: "good", text: t.review('exampleGood3') },
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onConfirm();
    }
  };

  const handleSkip = () => {
    onConfirm();
  };

  const step = steps[currentStep];

  return (
    <div className="!fixed !inset-0 !bg-black/60 !flex !items-center !justify-center !z-50 !p-4 !backdrop-blur-sm">
      <div className="!bg-white !rounded-3xl !shadow-2xl !w-full !max-w-md !max-h-[90vh] !overflow-y-auto !animate-fade-in">
        {/* Header */}
        <div className="!sticky !top-0 !bg-white !border-b !border-gray-200 !p-6 !rounded-t-3xl !z-10">
          <div className="!flex !items-center !justify-between !mb-2">
            <h2 className="!text-2xl !font-bold !text-gray-900">{t.review('reviewGuidelines')}</h2>
            <button
              onClick={onClose}
              className="!w-8 !h-8 !flex !items-center !justify-center !rounded-full 
                         !bg-gray-100 hover:!bg-gray-200 !transition-colors active:!scale-95"
              aria-label={t.review('close')}
            >
              <X className="!w-5 !h-5 !text-gray-600" />
            </button>
          </div>
          <div className="!flex !gap-2 !mt-4">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`!h-1.5 !flex-1 !rounded-full !transition-all ${
                  idx === currentStep
                    ? "!bg-blue-600"
                    : idx < currentStep
                    ? "!bg-green-500"
                    : "!bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="!p-6 !space-y-6">
          {/* Icon */}
          <div className="!flex !justify-center">{step.icon}</div>

          {/* Title & Description */}
          <div className="!text-center !space-y-3">
            <h3 className="!text-xl !font-bold !text-gray-900">{step.title}</h3>
            <p className="!text-gray-600 !text-sm !leading-relaxed">{step.description}</p>
          </div>

          {/* Examples */}
          <div className="!space-y-3">
            {step.examples.map((example, idx) => (
              <div
                key={idx}
                className={`!p-4 !rounded-xl !border-2 ${
                  example.type === "good"
                    ? "!bg-green-50 !border-green-200"
                    : "!bg-red-50 !border-red-200"
                }`}
              >
                <div className="!flex !items-start !gap-3">
                  <div className="!flex-shrink-0 !mt-0.5">
                    {example.type === "good" ? (
                      <CheckCircle className="!w-5 !h-5 !text-green-600" />
                    ) : (
                      <XCircle className="!w-5 !h-5 !text-red-600" />
                    )}
                  </div>
                  <div className="!flex-1">
                    <p className="!text-xs !font-semibold !mb-1 !uppercase !tracking-wide !text-gray-500">
                      {example.type === "good" ? t.review('goodExample') : t.review('badExample')}
                    </p>
                    <p className="!text-sm !text-gray-700 !italic">&quot;{example.text}&quot;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="!sticky !bottom-0 !bg-white !border-t !border-gray-200 !p-6 !rounded-b-3xl !space-y-3">
          <button
            onClick={handleNext}
            className="!w-full !py-4 !bg-blue-600 !text-white !font-semibold !rounded-xl
                       hover:!bg-blue-700 !transition-all active:!scale-98 !shadow-lg"
          >
            {currentStep === steps.length - 1 ? t.review('iUnderstand') : t.review('next')}
          </button>
          {currentStep === steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="!w-full !py-3 !text-gray-600 !text-sm !font-medium
                         hover:!text-gray-900 !transition-colors"
            >
              {t.review('skipForNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
