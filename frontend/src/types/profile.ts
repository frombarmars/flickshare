
export interface Movie {
  id: string;
  title: string;
  posterPath?: string;
}

export interface Review {
  id: string;
  rating: number;
  createdAt: string;
  movie: Movie;
  numericId: string;
}

export interface Support {
  id: string;
  amount: number;
  createdAt: string;
  review: {
    movie: Movie;
    reviewer: {
      username: string;
    };
  };
}
