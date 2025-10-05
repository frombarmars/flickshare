
export interface FormErrors {
  movie?: string;
  review?: string;
  rating?: string;
  submit?: string;
}

export interface MovieSuggestion {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
}
