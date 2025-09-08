import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '6')

    const movies = await prisma.movie.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { releaseDate: 'desc' },
      include: {
        _count: {
          select: {
            reviews: true
          }
        },
        crew: {
          where: {
            job: 'Director'
          },
          include: {
            person: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Get the last movie's ID to use as the next cursor
    const lastMovie = movies[movies.length - 1]
    const nextCursor = lastMovie?.id || null

    return NextResponse.json({ 
      movies, 
      nextCursor 
    })
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}