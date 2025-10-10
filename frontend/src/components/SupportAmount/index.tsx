/* eslint-disable react/prop-types */
// src/components/SupportAmount/index.tsx
import Image from "next/image";

const formatCoins = (coins: number) => {
  if (coins >= 1000000) return `${(coins / 1000000).toFixed(1)}M`;
  if (coins >= 1000) return `${(coins / 1000).toFixed(1)}K`;
  if (coins >= 1) return coins.toFixed(2);
  if (coins >= 0.01) return coins.toFixed(2);
  if (coins >= 0.001) return coins.toFixed(3);
  if (coins > 0) return '<0.001';
  return '0';
};

interface SupportAmountProps {
  amount: number;
}

export const SupportAmount: React.FC<SupportAmountProps> = ({ amount }) => {
  // Ensure amount is a valid number
  const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  
  return (
    <div className="px-2 py-1 bg-gray-100 rounded-md min-w-[60px]">
      <div className="flex items-center gap-1.5 text-gray-700">
        <Image
          src="/wld_token.png"
          alt="WLD"
          width={12}
          height={12}
          className="flex-shrink-0"
        />
        <span className="font-medium text-xs truncate">
          {formatCoins(validAmount)}
        </span>
      </div>
    </div>
  );
};
