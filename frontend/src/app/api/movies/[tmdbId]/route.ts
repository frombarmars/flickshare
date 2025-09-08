import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ENV_VARIABLES } from "@/constants/env_variables";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ tmdbId: string }> }
) {
  try {
    const tmdbId = parseInt((await context.params).tmdbId);

    // 🔎 1. Check if already in DB
    let movie = await prisma.movie.findUnique({
      where: { tmdbId },
      include: { movieGenres: { include: { genre: true } } },
    });

    // 🔎 2. Fetch details
    const res = await fetch(
      `${ENV_VARIABLES.TMDB_BASE_URL}/movie/${tmdbId}?language=en-US`,
      { headers: { Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}` } }
    );
    const movieData = await res.json();

    const creditsRes = await fetch(
      `${ENV_VARIABLES.TMDB_BASE_URL}/movie/${tmdbId}/credits`,
      { headers: { Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}` } }
    );
    const credits = await creditsRes.json();

    // 🔧 3. Ensure all genres exist in DB
    const genreIds: string[] = [];
    for (const g of movieData.genres || []) {
      const genre = await prisma.genre.upsert({
        where: { tmdbId: g.id },
        update: { name: g.name },
        create: { tmdbId: g.id, name: g.name },
      });
      genreIds.push(genre.id);
    }

    if (movie) {
      // 📝 4. If movie exists → update + sync genres
      movie = await prisma.movie.update({
        where: { tmdbId },
        data: {
          title: movieData.title,
          description: movieData.overview,
          releaseDate: movieData.release_date
            ? new Date(movieData.release_date)
            : null,
          runtime: movieData.runtime,
          posterPath: movieData.poster_path,
          backdropPath: movieData.backdrop_path,
          imdbId: movieData.imdb_id,
          popularity: movieData.popularity,
          voteAverage: movieData.vote_average,
          voteCount: movieData.vote_count,
          tagline: movieData.tagline,
          status: movieData.status,
          originalLang: movieData.original_language,
          adult: movieData.adult,

          // 🔄 reset & reconnect genres
          movieGenres: {
            deleteMany: {}, // remove old relations
            create: genreIds.map((gid) => ({ genreId: gid })),
          },
        },
        include: { movieGenres: { include: { genre: true } } },
      });

      return NextResponse.json({ success: true, movie, existed: true });
    }

    // 🆕 5. Otherwise, create new movie
    movie = await prisma.movie.create({
      data: {
        tmdbId,
        title: movieData.title,
        description: movieData.overview,
        releaseDate: movieData.release_date
          ? new Date(movieData.release_date)
          : null,
        runtime: movieData.runtime,
        posterPath: movieData.poster_path,
        backdropPath: movieData.backdrop_path,
        imdbId: movieData.imdb_id,
        popularity: movieData.popularity,
        voteAverage: movieData.vote_average,
        voteCount: movieData.vote_count,
        tagline: movieData.tagline,
        status: movieData.status,
        originalLang: movieData.original_language,
        adult: movieData.adult,

        movieGenres: {
          create: genreIds.map((gid) => ({ genreId: gid })),
        },

        cast: {
          create: credits.cast.slice(0, 10).map((c: any) => ({
            character: c.character,
            person: {
              connectOrCreate: {
                where: { tmdbId: c.id },
                create: {
                  tmdbId: c.id,
                  name: c.name,
                  photoPath: c.profile_path,
                },
              },
            },
          })),
        },

        crew: {
          create: credits.crew
            .filter((c: any) => ["Director", "Writer"].includes(c.job))
            .map((c: any) => ({
              job: c.job,
              person: {
                connectOrCreate: {
                  where: { tmdbId: c.id },
                  create: {
                    tmdbId: c.id,
                    name: c.name,
                    photoPath: c.profile_path,
                  },
                },
              },
            })),
        },
      },
      include: { movieGenres: { include: { genre: true } } },
    });

    return NextResponse.json({ success: true, movie, existed: false });
  } catch (err) {
    console.error("Save movie error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save movie" },
      { status: 500 }
    );
  }
}
