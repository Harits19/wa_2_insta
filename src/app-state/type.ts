export interface AppState {
  uploadFolder: string;
  date: {
    start: string;
    end: string;
  };
  post: {
    lastUpdate: string;
    totalPost: number;
  };
  filter?: {
    caption: string;
    startIndex: number;
  };
}
