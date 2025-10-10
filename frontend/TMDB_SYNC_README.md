# TMDB Sync System Documentation

This document explains how to use the comprehensive TMDB synchronization system for FlickShare.

## Overview

The TMDB sync system automatically fetches and maintains movie data from The Movie Database (TMDB) API, including:
- Movie details (title, description, runtime, ratings, etc.)
- Cast and crew information
- Genres and production data
- Director information for movie disambiguation

## 🚀 Quick Start

### 1. Dependencies
The system uses ts-node (already installed) to run TypeScript scripts.

### 2. Environment Setup
Make sure your `.env.local` has:
```bash
NEXT_PUBLIC_TMDB_API_BASE="https://api.themoviedb.org/3"
NEXT_PUBLIC_TMDB_API_KEY="your-tmdb-api-key"
```

### 3. Available Scripts

#### Sync All Existing Movies
Updates all movies in your database with latest TMDB data:
```bash
npm run tmdb-sync:all
```

#### Sync Movies with Missing Data
Finds and updates movies that have incomplete information:
```bash
npm run tmdb-sync:missing
```

#### Sync Specific Movies
Sync specific movies by their TMDB IDs:
```bash
npm run tmdb-sync sync-specific 550 680 13
```

## 📋 API Endpoints

### POST /api/tmdb/sync
Syncs a specific movie by TMDB ID.

**Request:**
```json
{
  "tmdbId": 550
}
```

**Response:**
```json
{
  "movie": { /* Full movie data with cast/crew */ },
  "action": "created" | "updated" | "found"
}
```

### GET /api/tmdb/sync?tmdbId=550
Checks sync status of a movie.

**Response:**
```json
{
  "exists": true,
  "needsSync": false,
  "movie": {
    "id": "movie-id",
    "title": "Fight Club",
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/movies/search?q=fight%20club&autoSync=true
Searches movies and optionally auto-syncs popular results.

## 🎯 React Hook Usage

### Basic Movie Sync
```typescript
import { useTMDBSync } from '@/hooks/useTMDBSync';

function MovieComponent() {
  const { syncMovie, isLoading, error } = useTMDBSync();

  const handleSyncMovie = async () => {
    const movie = await syncMovie(550); // Fight Club
    if (movie) {
      console.log('Movie synced:', movie.title);
    }
  };

  return (
    <button onClick={handleSyncMovie} disabled={isLoading}>
      {isLoading ? 'Syncing...' : 'Sync Movie'}
    </button>
  );
}
```

### Smart Sync (Only If Needed)
```typescript
import { useTMDBSync } from '@/hooks/useTMDBSync';

function SmartMovieSync({ tmdbId }: { tmdbId: number }) {
  const { syncMovieIfNeeded, isLoading } = useTMDBSync();

  useEffect(() => {
    // This will only sync if movie doesn't exist or needs updating
    syncMovieIfNeeded(tmdbId);
  }, [tmdbId]);

  if (isLoading) return <div>Loading movie data...</div>;
  
  return <div>Movie ready!</div>;
}
```

## 🔄 Automatic Sync Integration

### In Review Submission
The system automatically syncs movies when users submit reviews:

```typescript
// In your review submission API
import { tmdbSync } from '@/lib/tmdb-sync';

// Movie will be automatically synced if it doesn't exist
const movieId = await tmdbSync.syncMovieToDatabase(tmdbId);
```

### In Movie Search
Enable auto-sync for popular search results:

```typescript
// Search with auto-sync enabled
const response = await fetch('/api/movies/search?q=batman&autoSync=true');
```

## 📊 Data Structure

### Movie Data Includes:
- **Basic Info**: Title, description, release date, runtime
- **Media**: Poster and backdrop images
- **Ratings**: TMDB vote average and count
- **Metadata**: IMDB ID, original language, status
- **Genres**: Full genre information
- **Cast**: Actor names and characters
- **Crew**: Directors, writers, producers with job titles

### Director Information
The system specifically tracks directors for movie disambiguation:

```typescript
// Find director from crew data
const director = movie.crew.find(person => person.job === 'Director');
console.log(`Directed by: ${director?.person.name}`);
```

## ⚡ Performance Considerations

### Rate Limiting
- TMDB allows 4 requests/second
- Scripts include automatic rate limiting (250ms between requests)
- Bulk operations are batched appropriately

### Caching Strategy
- Movies updated within 24 hours are not re-synced in API calls
- Weekly updates for movies in review submissions
- Manual sync always forces updates

### Error Handling
- Individual movie sync failures don't stop batch operations
- Comprehensive error logging
- Graceful degradation when TMDB is unavailable

## 🛠️ Troubleshooting

### Common Issues

#### "TMDB API error: 401"
- Check your API key in `.env.local`
- Ensure the key has proper permissions

#### "Movie not found in TMDB"
- Verify the TMDB ID is correct
- Some movies may be removed from TMDB

#### "Rate limit exceeded"
- Wait a few minutes before retrying
- Reduce batch sizes for large sync operations

### Debug Mode
Enable verbose logging by setting:
```bash
NODE_ENV=development
```

## 📈 Usage Examples

### Example 1: Bulk Sync During Migration
```bash
# First sync movies with missing data
npm run tmdb-sync:missing

# Then update all movies (use cautiously on large datasets)
npm run tmdb-sync:all
```

### Example 2: Add New Movie Collection
```bash
# Add specific popular movies
npm run tmdb-sync sync-specific 550 680 13 238 129 155
```

### Example 3: Component Integration
```typescript
import { useTMDBSync } from '@/hooks/useTMDBSync';

function AddReviewForm() {
  const { syncMovieIfNeeded } = useTMDBSync();
  
  const handleMovieSelect = async (tmdbId: number) => {
    // Ensure movie exists in database before review submission
    const movie = await syncMovieIfNeeded(tmdbId);
    if (movie) {
      // Proceed with review form
      setSelectedMovie(movie);
    }
  };
}
```

## 🔧 Advanced Configuration

### Custom Sync Intervals
Modify the update intervals in the service:

```typescript
// In tmdb-sync.ts
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const FORCE_UPDATE_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
```

### Selective Data Sync
Choose which data to sync by modifying the service methods:

```typescript
// Sync only basic movie info (no cast/crew)
await tmdbSync.syncMovieBasicInfo(tmdbId);
```

## 📝 Best Practices

1. **Use Smart Sync**: Prefer `syncMovieIfNeeded()` over `syncMovie()` to avoid unnecessary API calls
2. **Enable Auto-Sync**: Use auto-sync in search for better user experience
3. **Monitor Rate Limits**: Keep track of TMDB API usage
4. **Handle Errors Gracefully**: Always provide fallback UI for sync failures
5. **Batch Operations**: Use scripts for bulk operations rather than individual API calls

## 🎉 Integration Complete

Your TMDB sync system is now ready! The system will:
- ✅ Automatically sync movies when users submit reviews
- ✅ Update existing movies with latest TMDB data
- ✅ Provide director information for movie disambiguation  
- ✅ Handle rate limiting and error scenarios
- ✅ Offer both manual and automatic sync options