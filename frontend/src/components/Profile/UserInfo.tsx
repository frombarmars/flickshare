"use client";
import { useState } from "react";
import Image from "next/image";
import { Copy, Check, Calendar, Edit, Coins } from "lucide-react";

interface UserInfoProps {
  username: string;
  profilePicture?: string;
  walletAddress: string;
  createdAt: string;
  bio?: string;
  setBio: (bio: string) => void;
  isOwner: boolean;
  totalPoints?: number;
}

export const UserInfo = ({
  username,
  profilePicture,
  walletAddress,
  createdAt,
  bio,
  setBio,
  isOwner,
  totalPoints = 0,
}: UserInfoProps) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(bio || "");

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBio = () => {
    setBio(editedBio);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <section className="py-8">
      <div className="flex flex-col items-center text-center space-y-6">
        
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-gray-100 border overflow-hidden">
          {profilePicture ? (
            <Image
              src={profilePicture}
              alt="Profile"
              width={96}
              height={96}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-lg font-medium">
                {username[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{username}</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Joined {formatDate(createdAt)}</span>
          </div>
        </div>

        {/* Points */}
        <div className="bg-blue-50 px-6 py-3 rounded-full border border-blue-100">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-700">
              {totalPoints.toLocaleString()} points
            </span>
          </div>
        </div>

        {/* Bio */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Bio</h3>
            {isOwner && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full h-20 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about yourself..."
                style={{ fontSize: '16px' }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBio}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm text-left">
              {bio || (isOwner ? "Add a bio to introduce yourself." : "No bio yet.")}
            </p>
          )}
        </div>

        {/* Wallet */}
        <div className="w-full max-w-md">
          <button
            onClick={handleCopyAddress}
            className="w-full p-4 bg-gray-50 border rounded-lg hover:bg-gray-100 flex items-center justify-between"
          >
            <div className="text-left">
              <p className="text-xs text-gray-500">Wallet Address</p>
              <p className="text-sm font-mono text-gray-800">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
              </p>
            </div>
            {copied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {copied && (
            <p className="text-xs text-green-600 mt-2">Copied to clipboard!</p>
          )}
        </div>
      </div>
    </section>
  );
};