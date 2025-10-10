import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // ✅ import Prisma for QueryMode enum

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 20);
    const rawSearch = searchParams.get("search")?.trim() || "";
    const search = rawSearch.length > 1 ? rawSearch : undefined;

    const where: Prisma.MovieWhereInput | undefined = search
      ? {
          OR: [
            { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              crew: {
                some: {
                  person: {
                    name: { contains: search, mode: Prisma.QueryMode.insensitive },
                  },
                },
              },
            },
          ],
        }
      : undefined;

    const movies = await prisma.movie.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { releaseDate: "desc" },
      include: {
        _count: { select: { reviews: true } },
        crew: {
          where: { job: "Director" },
          include: { person: { select: { name: true } } },
        },
      },
    });

    const hasMore = movies.length > limit;
    const paginatedMovies = hasMore ? movies.slice(0, -1) : movies;
    const nextCursor = hasMore ? paginatedMovies.at(-1)?.id ?? null : null;

    return NextResponse.json({
      movies: paginatedMovies,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("❌ Error fetching movies:", error);
    return NextResponse.json(
      { error: "Failed to fetch movies. Please try again later." },
      { status: 500 }
    );
  }
}
