export interface ReviewTopic {
  id: number;
  title: string;
  content: string;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option (0-3)
  block: string;
}
