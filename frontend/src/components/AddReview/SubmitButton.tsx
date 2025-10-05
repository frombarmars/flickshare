
interface SubmitButtonProps {
  loading: boolean;
  isConfirming: boolean;
  isSubmitDisabled: boolean;
}

export const SubmitButton = ({ loading, isConfirming, isSubmitDisabled }: SubmitButtonProps) => {
  return (
    <button
      type="submit"
      disabled={isSubmitDisabled}
      className="!w-full !h-14 !bg-black !hover:bg-gray-800 !disabled:bg-gray-400 !text-white !font-medium !rounded-2xl !transition-all !duration-200 shadow-lg"
    >
      {loading
        ? "Submitting..."
        : isConfirming
        ? "Confirming on-chain..."
        : !isSubmitDisabled
        ? "Submit Review"
        : "Sign in to submit"}
    </button>
  );
};
