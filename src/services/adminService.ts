import { collection, query, getDocs, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StudentProgressData {
  userId: string;
  userEmail: string;
  displayName: string;
  avgScore: number;
  totalAttempts: number;
  lastAttempt: Date;
}

export const getStudentsProgress = async (): Promise<StudentProgressData[]> => {
  const attemptsRef = collection(db, 'attempts');
  const q = query(attemptsRef, orderBy('timestamp', 'desc'), limit(1000));
  const querySnapshot = await getDocs(q);
  
  const studentMap: Record<string, any> = {};
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const userId = data.userId;
    
    if (!studentMap[userId]) {
      studentMap[userId] = {
        userId,
        userEmail: data.userEmail || 'N/A',
        displayName: data.displayName || 'Estudante',
        totalScore: 0,
        totalQuestions: 0,
        count: 0,
        lastAttempt: data.timestamp.toDate(),
      };
    }
    
    studentMap[userId].totalScore += data.score;
    studentMap[userId].totalQuestions += data.total;
    studentMap[userId].count += 1;
    
    const currentLast = studentMap[userId].lastAttempt;
    const attemptDate = data.timestamp.toDate();
    if (attemptDate > currentLast) {
      studentMap[userId].lastAttempt = attemptDate;
    }
  });

  return Object.values(studentMap).map(s => ({
    userId: s.userId,
    userEmail: s.userEmail,
    displayName: s.displayName,
    avgScore: Math.round((s.totalScore / s.totalQuestions) * 100),
    totalAttempts: s.count,
    lastAttempt: s.lastAttempt
  })).sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime());
};
