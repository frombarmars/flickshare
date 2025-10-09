"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useNotificationCount } from "@/context/NotificationContext";

interface NavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavProps) {
    const { unreadCount } = useNotificationCount();

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm max-w-md mx-auto flex items-center justify-between px-4">
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
            <Link href="/notification" className="relative p-2 group">
                <Bell className={`h-6 w-6 transition-all duration-200 ${
                    unreadCount > 0 
                        ? 'text-blue-600 animate-pulse' 
                        : 'text-gray-600 group-hover:text-gray-800'
                }`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold shadow-lg animate-bounce">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </Link>
        </div>
    );
}