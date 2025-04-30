export interface AppState {
  uploadFolder: string;
  year: string;
  post: {
    lastUpdate: string;
    totalPost: number;
    filename?: string;
  };
  filter?: {
    caption: string;
    startIndex: number;
  };
  errors?: AppStateError[];
}

export interface AppStateError {
  date: string;
  path: string;
  startIndex?: number;
  error: {
    message: string;
    name: string;
    stack?: string;
  };
}
