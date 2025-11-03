"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Copy, Check, Calendar, Edit, Coins, Star } from "lucide-react";
import { useTranslation } from "@/translations";

interface UserInfoProps {
  username: string;
  profilePicture?: string;
  walletAddress: string;
  createdAt: string;
  bio?: string;
  setBio: (bio: string) => void;
  isOwner: boolean;
  totalPoints?: number;
  hasEarlyPass?: boolean;
  totalWLDEarned?: number;
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
  hasEarlyPass = false,
  totalWLDEarned = 0,
}: UserInfoProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Sync editedBio when bio prop changes (when data loads from API)
  useEffect(() => {
    if (!isEditing) {
      setEditedBio(bio || "");
    }
  }, [bio, isEditing]);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBio = async () => {
    if (!username) return;
    
    setIsSaving(true);
    setSaveError("");
    
    try {
      const response = await fetch(`/api/profile/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: editedBio }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update bio');
      }
      
      const data = await response.json();
      if (data.success) {
        setBio(editedBio);
        setIsEditing(false);
      } else {
        throw new Error(data.error || 'Failed to update bio');
      }
    } catch (err: any) {
      console.error('Error saving bio:', err);
      setSaveError(err.message || 'Failed to save bio. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
            <span>{t.profile('joined')} {formatDate(createdAt)}</span>
            {hasEarlyPass && (
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium border border-yellow-200">
                <Star className="w-3 h-3 fill-current" />
                <span>{t.profile('earlyPass')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          {/* Points */}
          <div className="bg-blue-50 px-5 py-3 rounded-full border border-blue-100">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-700 text-sm">
                {totalPoints.toLocaleString()} {t.profile('points')}
              </span>
            </div>
          </div>

          {/* WLD Earned */}
          <div className="bg-green-50 px-5 py-3 rounded-full border border-green-100">
            <div className="flex items-center gap-2">
              <Image src="/wld_token.png" alt="WLD" width={16} height={16} className="object-contain" />
              <span className="font-semibold text-green-700 text-sm">
                {totalWLDEarned.toFixed(2)} WLD
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="!w-full !max-w-md !space-y-3">
          <div className="!flex !items-center !justify-between !mb-2">
            <h3 className="!text-sm !font-semibold !text-gray-800">{t.profile('about')}</h3>
            {isOwner && !isEditing && (
              <button 
                onClick={() => {
                  setIsEditing(true);
                  setEditedBio(bio || "");
                  setSaveError("");
                }}
                className="!text-sm !text-blue-600 hover:!text-blue-700 !flex !items-center !gap-1 
                           !transition-colors active:!scale-95 !font-medium"
              >
                <Edit className="!w-4 !h-4" />
                {t.profile('edit')}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="!space-y-3">
              <div className="!relative">
                <textarea
                  value={editedBio}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setEditedBio(e.target.value);
                      setSaveError("");
                    }
                  }}
                  className="!w-full !h-28 !p-3 !pr-12 !border-2 !border-gray-300 !rounded-2xl 
                             !resize-none focus:!outline-none focus:!ring-2 focus:!ring-blue-500 
                             focus:!border-blue-500 !bg-white !text-gray-900 !text-sm
                             disabled:!bg-gray-100 disabled:!cursor-not-allowed
                             !transition-all !shadow-sm"
                  placeholder={t.profile('tellAboutYourself')}
                  maxLength={200}
                  style={{ fontSize: '16px' }}
                  disabled={isSaving}
                  autoFocus
                />
                <div className="!absolute !bottom-3 !right-3 !text-xs !font-medium !text-gray-400 
                                !bg-white !px-2 !py-1 !rounded-md">
                  {editedBio.length}/200
                </div>
              </div>
              
              {saveError && (
                <p className="!text-xs !text-red-600 !font-medium !px-1 !py-1 !bg-red-50 !rounded-lg">
                  ⚠️ {saveError}
                </p>
              )}
              
              <div className="!flex !gap-2 !justify-end">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedBio(bio || "");
                    setSaveError("");
                  }}
                  disabled={isSaving}
                  className="!px-5 !py-2.5 !text-sm !font-medium !text-gray-700 
                             !bg-gray-100 !rounded-xl hover:!bg-gray-200
                             disabled:!opacity-50 disabled:!cursor-not-allowed
                             !transition-all active:!scale-95 !border !border-gray-200"
                >
                  {t.profile('cancel')}
                </button>
                <button
                  onClick={handleSaveBio}
                  disabled={isSaving || editedBio === bio}
                  className="!px-6 !py-2.5 !text-sm !font-semibold !text-white 
                             !bg-blue-600 !rounded-xl hover:!bg-blue-700 
                             disabled:!bg-gray-300 disabled:!text-gray-500
                             disabled:!cursor-not-allowed !transition-all 
                             active:!scale-95 !flex !items-center !gap-2 !shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <span className="!w-3.5 !h-3.5 !border-2 !border-white !border-t-transparent 
                                       !rounded-full !animate-spin"></span>
                      {t.profile('saving')}
                    </>
                  ) : (
                    t.profile('save')
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="!bg-gray-50 !border-2 !border-gray-200 !rounded-2xl !p-4 !min-h-[80px]">
              <p className="!text-gray-700 !text-sm !leading-relaxed !whitespace-pre-wrap !text-left">
                {bio || (
                  <span className="!text-gray-400 !italic !text-sm">
                    {isOwner ? t.profile('clickEditToAddBio') : t.profile('noBioYet')}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Wallet */}
        <div className="w-full max-w-md">
          <button
            onClick={handleCopyAddress}
            className="w-full p-4 bg-gray-50 border rounded-lg hover:bg-gray-100 flex items-center justify-between"
          >
            <div className="text-left">
              <p className="text-xs text-gray-500">{t.profile('walletAddress')}</p>
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
            <p className="text-xs text-green-600 mt-2">{t.profile('copiedToClipboard')}</p>
          )}
        </div>
      </div>
    </section>
  );
};