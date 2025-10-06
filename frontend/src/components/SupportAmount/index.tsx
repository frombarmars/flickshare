/* eslint-disable react/prop-types */
// src/components/SupportAmount/index.tsx
import Image from "next/image";

const formatCoins = (coins: number) => {
  if (coins >= 1000000) return `${(coins / 1000000).toFixed(1)}M`;
  if (coins >= 1000) return `${(coins / 1000).toFixed(1)}K`;
  return coins.toString();
};

interface SupportAmountProps {
  amount: number;
}

export const SupportAmount: React.FC<SupportAmountProps> = ({ amount }) => {
  return (
    <div className="px-2 py-1 bg-gray-100 rounded-md">
      <div className="flex items-center gap-1.5 text-gray-700">
        <Image
          src="/wld_token.png"
          alt="WLD"
          width={20}
          height={20}
          className="mr-1"
        />
        <span className="font-medium">
          {formatCoins(amount)}
        </span>
      </div>
    </div>
  );
};
