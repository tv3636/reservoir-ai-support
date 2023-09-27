export interface Message {
  id: string;
  embedding: number[];
  text: string;
  timestamp: Date;
  author_id: string;
  thread_id?: string;
}
