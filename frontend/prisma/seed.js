import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const genres = [
    { tmdbId: 28, name: "Action" },
    { tmdbId: 12, name: "Adventure" },
    { tmdbId: 16, name: "Animation" },
    { tmdbId: 35, name: "Comedy" },
    { tmdbId: 80, name: "Crime" },
    { tmdbId: 99, name: "Documentary" },
    { tmdbId: 18, name: "Drama" },
    { tmdbId: 10751, name: "Family" },
    { tmdbId: 14, name: "Fantasy" },
    { tmdbId: 36, name: "History" },
    { tmdbId: 27, name: "Horror" },
    { tmdbId: 10402, name: "Music" },
    { tmdbId: 9648, name: "Mystery" },
    { tmdbId: 10749, name: "Romance" },
    { tmdbId: 878, name: "Science Fiction" },
    { tmdbId: 10770, name: "TV Movie" },
    { tmdbId: 53, name: "Thriller" },
    { tmdbId: 10752, name: "War" },
    { tmdbId: 37, name: "Western" }
  ];

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { tmdbId: genre.tmdbId },
      update: {},
      create: genre
    });
  }

  console.log("Genres seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
