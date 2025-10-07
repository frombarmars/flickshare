'use client';
import { useState } from 'react';
import { CircularIcon, Marble } from '@worldcoin/mini-apps-ui-kit-react';
import { CheckCircleSolid, Wallet, Timer, EditPencil, Twitter } from 'iconoir-react';
import { useSession } from 'next-auth/react';

export const UserInfo = () => {
  const { data: session, status, update } = useSession();
  const user = session?.user;

  const [isEditingXUsername, setIsEditingXUsername] = useState(false);
  const [xUsernameInput, setXUsernameInput] = useState(user?.twitterUsername || '');


  const displayXUsername = user?.twitterUsername?.trim() ? user.twitterUsername : 'Not provided';

  const updateXUsername = async (walletAddress: string, xUsername: string) => {
    const res = await fetch(`/api/users/${walletAddress}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ xUsername }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update xUsername');
    return result.data;
  };

  const handleXUsernameSave = async () => {
    try {
      if (!user?.walletAddress) return;

      const updatedUser = await updateXUsername(user.walletAddress, xUsernameInput);
      await update(); // 🔁 Force session refresh
      setIsEditingXUsername(false);
    } catch (error) {
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatRegistrationDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'long' });
    return `${month} ${year}`;
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (!user) return <div>No user session found.</div>;

  return (
    <div className="flex flex-col gap-4 rounded-xl w-full border-2 border-gray-200 p-4">
      {/* Profile Section */}
      <div className="flex flex-row items-center justify-start gap-4">
        <Marble src={user?.profilePictureUrl} className="w-14" />
        <div className="flex flex-row items-center justify-center">
          <span className="text-base font-semibold capitalize">
            {user?.username}
          </span>
          {user?.profilePictureUrl && (
            <CircularIcon size="sm" className="ml-2">
              <CheckCircleSolid className="text-blue-600" />
            </CircularIcon>
          )}
        </div>
      </div>

      {/* User Details Section */}
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">

        {/* Twitter Username */}
        <div className="flex flex-row items-center gap-3">
          <CircularIcon size="sm" className="bg-gray-100">
            <Twitter className="text-gray-600 w-4 h-4" />
          </CircularIcon>
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between w-full">
              <span className="text-[0.65rem] text-gray-500 uppercase tracking-wide">Twitter</span>
              {!isEditingXUsername && (
                <button
                  onClick={() => setIsEditingXUsername(true)}
                  className="text-xs text-blue-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors"
                >
                  <EditPencil className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
            {!isEditingXUsername ? (
              <span className={`text-xs font-medium ${displayXUsername === 'Not provided' ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                {displayXUsername}
              </span>
            ) : (
              <div className="mt-2">
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base w-full mb-2"
                  value={xUsernameInput}
                  onChange={(e) => setXUsernameInput(e.target.value)}
                  placeholder="Enter your Twitter username"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-green-600 text-white font-medium py-2.5 px-4 rounded-lg active:bg-green-700 transition-colors"
                    onClick={handleXUsernameSave}
                  >
                    Save
                  </button>
                  <button
                    className="flex-1 border border-gray-300 font-medium py-2.5 px-4 rounded-lg active:bg-gray-100 transition-colors"
                    onClick={() => {
                      setXUsernameInput(user.twitterUsername || '');
                      setIsEditingXUsername(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wallet */}
        {user?.walletAddress && (
          <div className="flex flex-row items-center gap-3">
            <CircularIcon size="sm" className="bg-gray-100">
              <Wallet className="text-gray-600 w-4 h-4" />
            </CircularIcon>
            <div className="flex flex-col">
              <span className="text-[0.65rem] text-gray-500 uppercase tracking-wide">Wallet</span>
              <span className="text-sm font-medium text-gray-800 font-mono">
                {formatWalletAddress(user.walletAddress)}
              </span>
            </div>
          </div>
        )}

        {/* Member Since */}
        {user?.createdAt && (
          <div className="flex flex-row items-center gap-3">
            <CircularIcon size="sm" className="bg-gray-100">
              <Timer className="text-gray-800 w-4 h-4" />
            </CircularIcon>
            <div className="flex flex-col">
              <span className="text-[0.65rem] text-gray-500 uppercase tracking-wide">Member Since</span>
              <span className="text-sm font-medium text-gray-800">
                {formatRegistrationDate(user.createdAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
