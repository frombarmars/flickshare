"use client";
import { useState, useRef, useEffect } from "react";
import {
    MessageSquare,
    Search,
    Star,
    ThumbsUp,
    Users,
    TrendingUp,
    Filter,
    X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface UserWithStats {
    id: string;
    username: string | null;
    walletAddress: string;
    profilePicture: string | null;
    discordUsername: string | null;
    twitterUsername: string | null;
    _count: {
        reviews: number;
        supports: number;
        referrals: number;
    };
    activityScore: number;
}

export default function UsersFeedPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("trending");
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSortDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Fetch users from API
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users');
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                const data = await response.json();
                setUsers(data.users);
            } catch (err) {
                console.error("Error fetching users:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(users);
            return;
        }

        const results = users.filter(
            (user) =>
                user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.discordUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.twitterUsername?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setFilteredUsers(results);
    }, [searchQuery, users]);

    // Sort filteredUsers
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        switch (sortBy) {
            case "trending": // default
                return b.activityScore - a.activityScore;
            case "reviews": // most reviews
                return b._count.reviews - a._count.reviews;
            case "supports": // most supports
                return b._count.supports - a._count.supports;
            default:
                return 0;
        }
    });

    const sortOptions = [
        { value: "trending", label: "Trending", icon: <TrendingUp size={14} /> },
        { value: "reviews", label: "Reviews", icon: <MessageSquare size={14} /> },
        { value: "supports", label: "Supports", icon: <ThumbsUp size={14} /> }
    ];

    const getRankBadge = (score: number) => {
        if (score > 90) return { label: "Elite", bg: "bg-black text-white" };
        if (score > 80) return { label: "Top", bg: "bg-gray-800 text-white" };
        return { label: "Rising", bg: "bg-gray-600 text-white" };
    };

    if (loading) {
        return (
            <div className="bg-white min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen pb-safe">
            {/* Header */}
            <div className="top-0 bg-white border-b border-gray-100 shadow-sm bg-white mt-2 pr-4 pl-4">
                {/* Search and Filter Bar - Condensed */}
                <div className="flex gap-2">
                    <div className="flex-1 bg-gray-100 rounded-lg p-2 flex items-center border border-gray-200">
                        <Search size={14} className="text-gray-500 mr-2 ml-1" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="flex-1 bg-transparent border-none outline-none text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mr-1"
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    
                    {/* Sort Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200"
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                        >
                            <Filter size={16} className="text-black" />
                        </button>
                        
                        <AnimatePresence>
                            {showSortDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]"
                                >
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg flex items-center ${
                                                sortBy === option.value ? 'bg-gray-100 font-medium' : ''
                                            }`}
                                            onClick={() => {
                                                setSortBy(option.value);
                                                setShowSortDropdown(false);
                                            }}
                                        >
                                            <span className="mr-2">{option.icon}</span>
                                            {option.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sort Indicator */}
                {searchQuery && (
                    <div className="mt-3 text-xs text-gray-600">
                        Showing {filteredUsers.length} results for &quot;{searchQuery}&quot; sorted by {sortOptions.find(opt => opt.value === sortBy)?.label?.toLowerCase()}
                    </div>
                )}
            </div>

            {/* User List */}
            <div className="px-4 pt-2 pb-20">
                {sortedUsers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full flex flex-col justify-center py-16 items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 mt-4"
                    >
                        <div className="bg-gray-100 rounded-full p-4">
                            <Users size={28} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">No users found</p>
                        <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                    </motion.div>
                ) : (
                    <div className="space-y-3 mt-4">
                        {sortedUsers.map((user, index) => {
                            const rank = getRankBadge(user.activityScore);
                            const displayName = user.username || `User_${user.walletAddress.substring(2, 6)}`;
                            const displayHandle = user.username
                                ? `@${user.username}`
                                : `@user_${user.walletAddress.substring(2, 6)}`;

                            return (
                                <Link
                                    key={user.id}
                                    href={`/profile/${user.username}`}
                                    className="block"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all cursor-pointer active:bg-gray-50"
                                    >
                                        {/* Avatar and Rank */}
                                        <div className="relative flex-shrink-0">
                                            <div className="w-14 h-14 rounded-full border-2 border-gray-100 overflow-hidden shadow-sm">
                                                <Image
                                                    src={user.profilePicture || "/placeholder.jpeg"}
                                                    alt={displayName}
                                                    width={56}
                                                    height={56}
                                                    className="object-cover"
                                                />
                                            </div>
                                            <span className={`absolute -top-1 -left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rank.bg}`}>
                                                #{index + 1}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-semibold text-black text-sm truncate">{displayName}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${rank.bg}`}>
                                                    {rank.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate mb-2">{displayHandle}</p>
                                            <div className="flex gap-4 mt-2 text-xs">
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <MessageSquare size={13} />
                                                    <span className="font-medium">{user._count.reviews}</span>
                                                    <span className="text-gray-400 ml-1">reviews</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <ThumbsUp size={13} />
                                                    <span className="font-medium">{user._count.supports}</span>
                                                    <span className="text-gray-400 ml-1">supports</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Star size={13} className="fill-gray-600 text-gray-600" />
                                                    <span className="font-medium">{user.activityScore}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Load More */}
            {sortedUsers.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 bg-white px-4 pt-2 pb-safe">
                    <button className="w-full py-3.5 bg-black text-white font-medium rounded-xl hover:bg-gray-800 active:bg-gray-900 transition-colors shadow">
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
}