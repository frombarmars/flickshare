"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ENV_VARIABLES } from "@/constants/env_variables";

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1' viewBox='0 0 1 1'%3E%3C/svg%3E";


type Movie = {
    id: number;
    title: string;
    release_date?: string;
    poster_path?: string;
    vote_average?: number;
};

export default function TrendingMovies() {
    const router = useRouter();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollObserver = useRef<IntersectionObserver | null>(null);
    const loadingRef = useRef(false);

    const fetchMovies = useCallback(async () => {
        if (loadingRef.current || !hasMore) return;
        loadingRef.current = true;
        setLoading(true);

        try {
            const res = await fetch(
                `${ENV_VARIABLES.TMDB_BASE_URL}/trending/movie/day?language=en-US&page=${page}`,
                {
                    headers: {
                        Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}`,
                        accept: "application/json",
                    },
                }
            );
            const data = await res.json();

            if (data.results?.length) {
                setMovies((prev) => {
                    const newMovies = data.results.filter(
                        (newMovie: Movie) =>
                            !prev.some((existingMovie) => existingMovie.id === newMovie.id)
                    );
                    return [...prev, ...newMovies];
                });
                setHasMore(page < data.total_pages);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error("Error fetching movies:", err);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [page, hasMore]);

    useEffect(() => {
        fetchMovies();
    }, [fetchMovies]);

    const lastMovieRef = useCallback(
        (node: HTMLElement | null) => {
            if (loading) return;
            if (scrollObserver.current) scrollObserver.current.disconnect();

            scrollObserver.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    setPage((prev) => prev + 1);
                }
            });

            if (node) scrollObserver.current.observe(node);
        },
        [loading, hasMore]
    );

    // Add this function to handle movie card click
    const handleMovieClick = (movieId: number) => {
        router.push(`/moviedetails/${movieId}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-gray-50/20 to-gray-100/30">
            {/* Elegant header */}
            <div className="sticky top-0 z-20 px-4 pt-4 pb-2">
                <div className="bg-white rounded-xl shadow-sm py-4 border border-gray-100"
                    style={{
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                    <div className="text-center">
                        <h1 className="text-lg font-medium text-gray-900 mb-1">
                            Trending Movies
                        </h1>
                        <p className="text-xs text-gray-500 font-normal">
                            Discover Today&apos;s Most Popular
                        </p>
                    </div>
                </div>
            </div>

            {/* Creative content layout */}
            <div className="px-4 pb-32">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
                    {movies.map((movie, index) => {
                        const isLast = index === movies.length - 1;
                        return (
                            <div
                                key={movie.id}
                                ref={isLast ? lastMovieRef : null}
                                className="group cursor-pointer transform transition-all duration-700 hover:-translate-y-2"
                                onClick={() => handleMovieClick(movie.id)}
                            >
                                <div className="relative">
                                    {/* Floating poster design */}
                                    <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-white shadow-2xl group-hover:shadow-3xl transition-all duration-700 transform group-hover:rotate-1"
                                        style={{
                                            boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 12px 24px rgba(0,0,0,0.08)'
                                        }}>
                                        <Image
                                            src={movie.poster_path ? `${ENV_VARIABLES.TMDB_IMAGE_BASE}${movie.poster_path}` : PLACEHOLDER_IMAGE}
                                            alt={movie.title}
                                            className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:brightness-105"
                                            width={200}
                                            height={300}
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.src = PLACEHOLDER_IMAGE;
                                                e.currentTarget.classList.add("bg-gray-50");
                                            }}
                                        />
                                        
                                        {/* Creative overlay effect */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl"></div>
                                        
                                        {/* Floating rating badge */}
                                        {movie.vote_average && (
                                            <div className="absolute -top-2 -right-2 bg-white rounded-2xl px-3 py-2 shadow-xl transform -rotate-12 group-hover:rotate-0 transition-all duration-500"
                                                style={{
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)'
                                                }}>
                                                <span className="text-xs font-bold text-gray-900">
                                                    {Math.round(movie.vote_average * 10)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Creative info layout */}
                                    <div className="mt-4 text-center">
                                        <h2 className="font-normal text-sm text-gray-900 mb-2 line-clamp-2 leading-normal">
                                            {movie.title}
                                        </h2>
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="h-px w-6 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-50"></div>
                                            <span className="text-sm text-gray-600">
                                                {movie.release_date ? new Date(movie.release_date).getFullYear() : "TBA"}
                                            </span>
                                            <div className="h-px w-6 bg-gradient-to-r from-gray-300 via-transparent to-transparent opacity-50"></div>
                                        </div>
                                    </div>

                                    {/* Creative hover effect */}
                                    <div className="absolute -inset-4 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                        style={{
                                            background: 'radial-gradient(circle at center, rgba(0,0,0,0.02) 0%, transparent 70%)'
                                        }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Creative loading animation */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="relative w-8 h-8">
                            <div className="absolute inset-0 rounded-full bg-white shadow-md animate-pulse"
                                style={{
                                    boxShadow: '0 0 16px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.9)'
                                }}>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-6 font-normal">
                            Loading More
                        </p>
                        <div className="mt-2 h-px w-16 bg-gradient-to-r from-transparent via-gray-300 to-transparent animate-pulse"></div>
                    </div>
                )}

                {/* Creative end state */}
                {!hasMore && (
                    <div className="flex flex-col items-center justify-center py-24 mt-16">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center mb-6"
                                style={{
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.9)'
                                }}>
                            </div>
                            <div className="absolute -inset-6 rounded-full animate-pulse"
                                style={{
                                    background: 'radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)'
                                }}></div>
                        </div>
                        <p className="text-sm text-gray-600 font-normal text-center mb-3">
                            Collection Complete
                        </p>
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    </div>
                )}
            </div>
        </div>
    );
}