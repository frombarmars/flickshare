"use client";

interface NavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavProps) {
    return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm bg-white max-w-md mx-auto">
        <div className="flex justify-center items-center gap-8">
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
    </div>
    );
}