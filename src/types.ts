export interface Api {
  path: string;
  embedding: number[];
  name: string;
  spec: any;
  version: number;
}

export interface Doc {
  slug: string;
  embedding: number[];
  title: string;
  body: string;
  updated_at: string;
}

export interface Message {
  id: string;  
  embedding: number[];
  text: string;
  timestamp: Date;
  author_id: string;
  thread_id?: string;
}
