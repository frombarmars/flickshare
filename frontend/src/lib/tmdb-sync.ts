import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TMDBMovieResponse {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: any;
  budget: number;
  genres: Array<{
    id: number;
    name: string;
  }>;
  homepage: string;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: Array<{
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }>;
  production_countries: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  release_date: string;
  revenue: number;
  runtime: number | null;
  spoken_languages: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

interface TMDBCreditsResponse {
  id: number;
  cast: Array<{
    adult: boolean;
    gender: number;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string | null;
    cast_id: number;
    character: string;
    credit_id: string;
    order: number;
  }>;
  crew: Array<{
    adult: boolean;
    gender: number;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string | null;
    credit_id: string;
    department: string;
    job: string;
  }>;
}

export class TMDBSyncService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY!;
    this.baseUrl = process.env.NEXT_PUBLIC_TMDB_API_BASE!;
  }

  private async fetchFromTMDB(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchMovieDetails(tmdbId: number): Promise<TMDBMovieResponse> {
    return this.fetchFromTMDB(`/movie/${tmdbId}`);
  }

  async fetchMovieCredits(tmdbId: number): Promise<TMDBCreditsResponse> {
    return this.fetchFromTMDB(`/movie/${tmdbId}/credits`);
  }

  async syncMovieToDatabase(tmdbId: number): Promise<string> {
    try {
      // Check if movie already exists
      const existingMovie = await prisma.movie.findUnique({
        where: { tmdbId }
      });

      if (existingMovie) {
        console.log(`Movie with TMDB ID ${tmdbId} already exists`);
        return existingMovie.id;
      }

      // Fetch movie details and credits in parallel
      const [movieData, creditsData] = await Promise.all([
        this.fetchMovieDetails(tmdbId),
        this.fetchMovieCredits(tmdbId)
      ]);

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create/update genres
        const genreIds: string[] = [];
        for (const genre of movieData.genres) {
          const existingGenre = await tx.genre.findUnique({
            where: { tmdbId: genre.id }
          });

          let genreRecord;
          if (existingGenre) {
            genreRecord = existingGenre;
          } else {
            genreRecord = await tx.genre.create({
              data: {
                tmdbId: genre.id,
                name: genre.name
              }
            });
          }
          genreIds.push(genreRecord.id);
        }

        // 2. Create movie
        const movie = await tx.movie.create({
          data: {
            tmdbId: movieData.id,
            title: movieData.title,
            description: movieData.overview,
            releaseDate: movieData.release_date ? new Date(movieData.release_date) : null,
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
            adult: movieData.adult
          }
        });

        // 3. Create movie-genre relationships
        for (const genreId of genreIds) {
          await tx.movieGenre.create({
            data: {
              movieId: movie.id,
              genreId: genreId
            }
          });
        }

        // 4. Process cast and crew
        const peopleToProcess = new Map<number, any>();

        // Collect all unique people from cast and crew
        for (const castMember of creditsData.cast) {
          peopleToProcess.set(castMember.id, {
            tmdbId: castMember.id,
            name: castMember.name,
            photoPath: castMember.profile_path
          });
        }

        for (const crewMember of creditsData.crew) {
          peopleToProcess.set(crewMember.id, {
            tmdbId: crewMember.id,
            name: crewMember.name,
            photoPath: crewMember.profile_path
          });
        }

        // 5. Create/update people
        const personIdMap = new Map<number, string>();
        for (const [tmdbId, personData] of peopleToProcess) {
          const existingPerson = await tx.person.findUnique({
            where: { tmdbId }
          });

          let person;
          if (existingPerson) {
            person = existingPerson;
          } else {
            person = await tx.person.create({
              data: {
                tmdbId: personData.tmdbId,
                name: personData.name,
                photoPath: personData.photoPath
              }
            });
          }
          personIdMap.set(tmdbId, person.id);
        }

        // 6. Create cast relationships
        for (const castMember of creditsData.cast) {
          const personId = personIdMap.get(castMember.id);
          if (personId) {
            await tx.movieCast.create({
              data: {
                movieId: movie.id,
                personId: personId,
                character: castMember.character
              }
            });
          }
        }

        // 7. Create crew relationships
        for (const crewMember of creditsData.crew) {
          const personId = personIdMap.get(crewMember.id);
          if (personId) {
            await tx.movieCrew.create({
              data: {
                movieId: movie.id,
                personId: personId,
                job: crewMember.job
              }
            });
          }
        }

        return movie.id;
      });

      console.log(`Successfully synced movie: ${movieData.title} (TMDB ID: ${tmdbId})`);
      return result;

    } catch (error) {
      console.error(`Error syncing movie with TMDB ID ${tmdbId}:`, error);
      throw error;
    }
  }

  async updateExistingMovie(tmdbId: number): Promise<void> {
    try {
      const existingMovie = await prisma.movie.findUnique({
        where: { tmdbId },
        select: { id: true, title: true }
      });

      if (!existingMovie) {
        throw new Error(`Movie with TMDB ID ${tmdbId} not found in database`);
      }

      // Only fetch credits data, not basic movie details
      const creditsData = await this.fetchMovieCredits(tmdbId);

      await prisma.$transaction(async (tx) => {
        // Clear existing cast and crew data
        await tx.movieCast.deleteMany({
          where: { movieId: existingMovie.id }
        });
        
        await tx.movieCrew.deleteMany({
          where: { movieId: existingMovie.id }
        });

        // Process cast and crew
        const peopleToProcess = new Map<number, any>();

        // Collect all unique people from cast and crew
        for (const castMember of creditsData.cast) {
          peopleToProcess.set(castMember.id, {
            tmdbId: castMember.id,
            name: castMember.name,
            photoPath: castMember.profile_path
          });
        }

        for (const crewMember of creditsData.crew) {
          peopleToProcess.set(crewMember.id, {
            tmdbId: crewMember.id,
            name: crewMember.name,
            photoPath: crewMember.profile_path
          });
        }

        // Batch check existing people
        const tmdbIds = Array.from(peopleToProcess.keys());
        const existingPeople = await tx.person.findMany({
          where: { tmdbId: { in: tmdbIds } }
        });
        
        const existingPeopleMap = new Map(
          existingPeople.map(person => [person.tmdbId, person])
        );

        // Create new people in batch
        const newPeopleData: Array<{tmdbId: number; name: string; photoPath: string | null}> = [];
        for (const [tmdbId, personData] of peopleToProcess) {
          if (!existingPeopleMap.has(tmdbId)) {
            newPeopleData.push({
              tmdbId: personData.tmdbId,
              name: personData.name,
              photoPath: personData.photoPath
            });
          }
        }

        if (newPeopleData.length > 0) {
          await tx.person.createMany({
            data: newPeopleData
          });
        }

        // Get all people IDs after creation
        const allPeople = await tx.person.findMany({
          where: { tmdbId: { in: tmdbIds } },
          select: { id: true, tmdbId: true }
        });
        
        const personIdMap = new Map(
          allPeople.map(person => [person.tmdbId, person.id])
        );

        // Batch create cast relationships
        const castData: Array<{movieId: string; personId: string; character: string}> = [];
        for (const castMember of creditsData.cast) {
          const personId = personIdMap.get(castMember.id);
          if (personId) {
            castData.push({
              movieId: existingMovie.id,
              personId: personId,
              character: castMember.character
            });
          }
        }

        if (castData.length > 0) {
          await tx.movieCast.createMany({
            data: castData
          });
        }

        // Batch create crew relationships
        const crewData: Array<{movieId: string; personId: string; job: string}> = [];
        for (const crewMember of creditsData.crew) {
          const personId = personIdMap.get(crewMember.id);
          if (personId) {
            crewData.push({
              movieId: existingMovie.id,
              personId: personId,
              job: crewMember.job
            });
          }
        }

        if (crewData.length > 0) {
          await tx.movieCrew.createMany({
            data: crewData
          });
        }

        // Only update the updatedAt timestamp, not the movie data
        await tx.movie.update({
          where: { id: existingMovie.id },
          data: {
            updatedAt: new Date()
          }
        });

        console.log(`Updated cast and crew for: ${existingMovie.title} (TMDB ID: ${tmdbId})`);
      }, { timeout: 15000 }); // Increase timeout to 15 seconds

    } catch (error) {
      console.error(`Error updating cast/crew for movie with TMDB ID ${tmdbId}:`, error);
      throw error;
    }
  }

  async syncAllMoviesInDatabase(): Promise<void> {
    try {
      const movies = await prisma.movie.findMany({
        select: { tmdbId: true, title: true }
      });

      console.log(`Starting sync for ${movies.length} movies...`);

      for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        try {
          await this.updateExistingMovie(movie.tmdbId);
          console.log(`✅ [${i + 1}/${movies.length}] Updated: ${movie.title}`);
          
          // Rate limiting: wait 250ms between requests to respect TMDB API limits
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`❌ [${i + 1}/${movies.length}] Failed to update: ${movie.title}`, error);
        }
      }

      console.log('Finished syncing all movies');
    } catch (error) {
      console.error('Error in syncAllMoviesInDatabase:', error);
      throw error;
    }
  }
}

export const tmdbSync = new TMDBSyncService();