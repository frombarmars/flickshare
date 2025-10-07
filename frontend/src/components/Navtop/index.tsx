"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";

interface NavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Navigation({ activeTab, setActiveTab }: NavProps) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const { data } = useSWR(
        userId ? `/api/notifications/unread-count/${userId}` : null,
        fetcher,
        { refreshInterval: 5000 }
    );
    const unreadCount = data?.unreadCount || 0;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm bg-white max-w-md mx-auto flex items-center justify-between px-4">
            <div className="flex justify-center items-center gap-8 flex-grow">
                <button
                    onClick={() => setActiveTab("reviews")}
                    className={`!relative !px-6 !py-4 !text-sm !font-medium !transition-all !duration-300 ${
                        activeTab === "reviews"
                            ? "!text-black"
                            : "!text-gray-500 hover:!text-gray-700"
                    }`}
                >
                    Reviews
                    {activeTab === "reviews" && (
                        <span className="!absolute bottom-0 !left-1/2 !transform !-translate-x-1/2 w-16 h-0.5 !bg-black !rounded-full"></span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("movies")}
                    className={`!relative !px-6 !py-4 !text-sm !font-medium !transition-all !duration-300 ${
                        activeTab === "movies"
                            ? "!text-black"
                            : "!text-gray-500 hover:!text-gray-700"
                    }`}
                >
                    Movies
                    {activeTab === "movies" && (
                        <span className="!absolute !bottom-0 !left-1/2 !transform !-translate-x-1/2 !w-16 !h-0.5 !bg-black !rounded-full"></span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("users")}
                    className={`!relative !px-6 !py-4 !text-sm !font-medium !transition-all !duration-300 ${
                        activeTab === "users"
                            ? "!text-black"
                            : "!text-gray-500 !hover:text-gray-700"
                    }`}
                >
                    Users
                    {activeTab === "users" && (
                        <span className="!absolute !bottom-0 !left-1/2 !transform !-translate-x-1/2 !w-16 !h-0.5 !bg-black !rounded-full"></span>
                    )}
                </button>
            </div>
            <Link href="/notification" className="relative p-2">
                <Bell className="h-6 w-6 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </Link>
        </div>
    );
}