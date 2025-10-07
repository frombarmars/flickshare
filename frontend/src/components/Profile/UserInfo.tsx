import { useState, useEffect } from "react";
import Image from "next/image";
import { Copy, Check, Calendar, Edit, Save } from "lucide-react";
import { CircularIcon } from "@worldcoin/mini-apps-ui-kit-react";
import { CheckCircleSolid } from "iconoir-react";

interface UserInfoProps {
  username: string;
  profilePicture?: string;
  walletAddress: string;
  createdAt: string;
  bio?: string;
  setBio: (bio: string) => void;
  isOwner: boolean;
}

export const UserInfo = ({ username, profilePicture, walletAddress, createdAt, bio, setBio, isOwner }: UserInfoProps) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(bio || "");

  useEffect(() => {
    setEditedBio(bio || "");
  }, [bio]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch(`/api/profile/${username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: editedBio }),
      });
      if (!res.ok) throw new Error('Failed to save bio');
      const data = await res.json();
      setBio(data.data.bio);
      setIsEditing(false);
    } catch (err) {
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <section className="pt-8 pb-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="w-40 h-40 rounded-full border-3 border-gray-200 shadow-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
            {profilePicture ? (
              <Image
                src={profilePicture}
                alt="User Avatar"
                width={160}
                height={160}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <svg
                  className="w-20 h-20 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <div className="flex items-center justify-center">
            <h2 className="text-xl font-bold text-black">{username}</h2>
            <CircularIcon size="sm">
              <CheckCircleSolid className="text-blue-600" />
            </CircularIcon>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-4 h-4 flex-shrink-0"><Calendar className="w-4 h-4 text-gray-400" /></span>
            <span>Joined:</span>
            <span className="font-medium text-gray-900 truncate">{formatDate(createdAt)}</span>
          </div>
        </div>

        <div className="w-full mb-6 p-4 bg-gray-50 rounded-lg">
          {isEditing ? (
            <div className="flex flex-col items-center">
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full h-24 p-2 border rounded-md bg-white"
                placeholder="Tell us about yourself..."
              />
              <button onClick={handleSaveBio} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md flex items-center hover:bg-blue-600">
                <Save className="w-4 h-4 mr-2" /> Save Bio
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-gray-700 text-sm text-center">{bio || "This user hasn't set a bio yet."}</p>
              {isOwner && (
                <button onClick={() => setIsEditing(true)} className="mt-4 px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-semibold flex items-center hover:bg-gray-300">
                  <Edit className="w-3 h-3 mr-1" /> Edit Bio
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleCopyAddress}
          className="w-full rounded-2xl px-4 py-5 bg-grey-50 hover:shadow-md active:shadow-sm transition-all duration-200 touch-manipulation active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
            <span className="text-xs font-mono text-gray-700 truncate w-[calc(100%-28px)]">
              {walletAddress.slice(0, 5)}...{walletAddress.slice(-4)}
            </span>

            {copied ? (
              <Check className="w-5 h-5 text-green-600 transition-transform duration-200 scale-105 flex-shrink-0" strokeWidth={2.5} />
            ) : (
              <Copy className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors duration-200 flex-shrink-0" strokeWidth={2} />
            )}
          </div>

          {copied && (
            <p className="text-xs text-green-600 mt-4 font-medium text-center animate-fadeIn">
              Copied to clipboard!
            </p>
          )}
        </button>
      </div>
    </section>
  );
};