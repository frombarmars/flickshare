
interface SubmitButtonProps {
  loading: boolean;
  isConfirming: boolean;
  isSubmitDisabled: boolean;
  isLoggedIn: boolean;
}

export const SubmitButton = ({ loading, isConfirming, isSubmitDisabled, isLoggedIn }: SubmitButtonProps) => {
  const getButtonText = () => {
    if (loading) return "Submitting...";
    if (isConfirming) return "Confirming on-chain...";
    if (!isLoggedIn) return "Sign in to submit";
    if (isSubmitDisabled) return "Fill out the form to submit";
    return "Submit Review";
  };

  return (
    <button
      type="submit"
      disabled={isSubmitDisabled}
      className="!w-full !h-14 !bg-black !hover:bg-gray-800 !disabled:bg-gray-400 !text-white !font-medium !rounded-2xl !transition-all !duration-200 shadow-lg"
    >
      {getButtonText()}
    </button>
  );
};
