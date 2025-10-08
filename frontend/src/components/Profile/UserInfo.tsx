"use client";
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

export const UserInfo = ({
  username,
  profilePicture,
  walletAddress,
  createdAt,
  bio,
  setBio,
  isOwner,
}: UserInfoProps) => {
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
    } catch {}
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch(`/api/profile/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: editedBio }),
      });
      if (!res.ok) throw new Error("Failed to save bio");
      const data = await res.json();
      setBio(data.data.bio);
      setIsEditing(false);
    } catch {}
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <section className="pt-8 pb-8">
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative mb-5">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
            {profilePicture ? (
              <Image
                src={profilePicture}
                alt="User Avatar"
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-400 bg-gray-50">
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0v.75H4.5v-.75z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Username + Join Date */}
        <div className="space-y-1 mb-6">
          <div className="flex items-center justify-center gap-1">
            <h2 className="text-lg font-semibold text-gray-900">{username}</h2>
            <CircularIcon size="sm">
              <CheckCircleSolid className="text-blue-600" />
            </CircularIcon>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Joined {formatDate(createdAt)}</span>
          </div>
        </div>

        {/* Bio Section */}
        <div className="w-full max-w-xs p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
          {isEditing ? (
            <div className="flex flex-col items-center gap-2">
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full h-20 p-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
                placeholder="Write something about yourself..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveBio}
                  className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg flex items-center gap-1 hover:bg-blue-600 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button
                  onClick={() => {
                    setEditedBio(bio || "");
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p
                className={`text-sm text-gray-700 text-center ${
                  bio ? "" : "italic text-gray-400"
                }`}
              >
                {bio || "No bio yet."}
              </p>
              {isOwner && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Bio
                </button>
              )}
            </div>
          )}
        </div>

        {/* Wallet Section */}
        <button
          onClick={handleCopyAddress}
          className="w-full max-w-xs px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-700 truncate w-[calc(100%-28px)]">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            {copied ? (
              <Check className="w-5 h-5 text-green-600 transition-transform duration-200 scale-105" />
            ) : (
              <Copy className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
            )}
          </div>
          {copied && (
            <p className="text-[11px] text-green-600 mt-2 font-medium text-center">
              Copied!
            </p>
          )}
        </button>
      </div>
    </section>
  );
};
