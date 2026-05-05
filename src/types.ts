export interface ReviewTopic {
  id: number;
  moduleId: string;
  title: string;
  content: string;
}

export interface Question {
  id: number;
  moduleId: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option (0-3)
  block: string;
}
