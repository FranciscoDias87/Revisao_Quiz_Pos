import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  GraduationCap, 
  Home, 
  Layout, 
  ArrowRight, 
  RotateCcw,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Info,
  LogOut,
  User as UserIcon,
  Loader2,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import { reviewTopics as staticTopics } from './data/content';
import { quizQuestions as staticQuestions } from './data/questions';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { ContentManager } from './components/ContentManager';

type View = 'home' | 'review' | 'quiz' | 'results' | 'admin';
type AdminTab = 'progress' | 'content';
type ModuleId = 'eval' | 'disorders';

const MODULES: Record<ModuleId, { title: string; desc: string; icon: string }> = {
  eval: {
    title: 'Paradigmas da Avaliação',
    desc: 'Avaliação, currículo e políticas educacionais brasileiras.',
    icon: 'eval'
  },
  disorders: {
    title: 'Dificuldades e Transtornos',
    desc: 'Concepções, aspectos neurológicos e transtornos específicos.',
    icon: 'disorders'
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('progress');
  const [selectedModule, setSelectedModule] = useState<ModuleId | null>(null);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  
  const [dbTopics, setDbTopics] = useState<any[]>([]);
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          let role = 'student';
          if (currentUser.email === 'chicodias15@gmail.com' || currentUser.email === 'admin@edureview.com') {
            role = 'admin';
          }

          if (!userSnap.exists()) {
            await setDoc(userDocRef, {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: role,
              lastLogin: serverTimestamp(),
              createdAt: serverTimestamp()
            });
            setUserProfile({ role });
          } else {
            const data = userSnap.data();
            // Force role update if email matches admin list but DB says student
            const activeRole = (currentUser.email === 'chicodias15@gmail.com' || currentUser.email === 'admin@edureview.com') ? 'admin' : (data.role || role);
            
            setUserProfile({ role: activeRole });
            await setDoc(userDocRef, {
              lastLogin: serverTimestamp(),
              role: activeRole // Sync if changed
            }, { merge: true });
          }
        } catch (error) {
          console.error("Error syncing profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Firestore Content
  useEffect(() => {
    if (user && selectedModule) {
      const fetchContent = async () => {
        try {
          const topicsRef = collection(db, 'topics');
          const topicsSnap = await getDocs(query(topicsRef, where('moduleId', '==', selectedModule), orderBy('order', 'asc')));
          const questionsRef = collection(db, 'questions');
          const questionsSnap = await getDocs(query(questionsRef, where('moduleId', '==', selectedModule)));

          setDbTopics(topicsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setDbQuestions(questionsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
          console.error("Error fetching content:", error);
        }
      };
      fetchContent();
    }
  }, [user, selectedModule]);

  const filteredTopics = useMemo(() => {
    const firestoreItems = dbTopics.filter(t => t.moduleId === selectedModule);
    const staticItems = staticTopics.filter(t => t.moduleId === selectedModule);
    return [...staticItems, ...firestoreItems].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [selectedModule, dbTopics]);

  const filteredQuestions = useMemo(() => {
    const firestoreItems = dbQuestions.filter(q => q.moduleId === selectedModule);
    const staticItems = staticQuestions.filter(q => q.moduleId === selectedModule);
    return [...staticItems, ...firestoreItems];
  }, [selectedModule, dbQuestions]);

  const score = useMemo(() => {
    return Object.entries(answers).reduce((acc, [qId, answerIndex]) => {
      const question = filteredQuestions.find(q => q.id === qId || q.id === Number(qId));
      return question && question.correctAnswer === answerIndex ? acc + 1 : acc;
    }, 0);
  }, [answers, filteredQuestions]);

  const saveAttempt = async () => {
    if (!user || !selectedModule) return;
    try {
      await addDoc(collection(db, 'attempts'), {
        userId: user.uid,
        userEmail: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        moduleId: selectedModule,
        score,
        total: filteredQuestions.length,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving attempt:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('home');
      setSelectedModule(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const startReview = (moduleId: ModuleId) => {
    setSelectedModule(moduleId);
    setCurrentTopicIndex(0);
    setView('review');
  };

  const startQuiz = (moduleId: ModuleId) => {
    setSelectedModule(moduleId);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setView('quiz');
  };

  const finalizeQuiz = () => {
    setView('results');
    saveAttempt();
  };

  const handleAnswer = (questionId: number | string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const getQuestionStatus = (questionId: number | string) => {
    if (answers[questionId] === undefined) return 'unanswered';
    const question = filteredQuestions.find(q => q.id === questionId);
    if (!question) return 'unanswered';
    return answers[questionId] === question.correctAnswer ? 'correct' : 'incorrect';
  };

  const resetQuiz = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setView('quiz');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-medium">Carregando EduReview...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group"
            onClick={() => { setView('home'); setSelectedModule(null); }}
          >
            <div className="bg-indigo-600 p-1 rounded-lg text-white group-hover:scale-110 transition-transform sm:p-1.5">
              <GraduationCap size={18} className="sm:w-[20px] sm:h-[20px]" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight">EduReview</span>
          </div>
          
          <div className="flex items-center gap-4">
            {userProfile?.role === 'admin' && view !== 'admin' && (
              <button 
                onClick={() => setView('admin')}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-all"
              >
                <Trophy size={14} /> <span className="hidden xs:inline">Painel Admin</span>
              </button>
            )}

            {selectedModule && view !== 'admin' && (
              <div className="hidden md:flex gap-3 sm:gap-4 border-r border-slate-200 pr-4 mr-2">
                <button 
                  onClick={() => setView('review')}
                  className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium transition-colors ${view === 'review' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  <BookOpen size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>Revisão</span>
                </button>
                <button 
                  onClick={() => setView('quiz')}
                  className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium transition-colors ${view === 'quiz' || view === 'results' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  <Layout size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>Simulado</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden xs:flex flex-col items-end mr-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {userProfile?.role === 'admin' ? 'Administrador' : 'Estudante'}
                </span>
                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </div>
              
              {user.photoURL ? (
                <div className="relative">
                  <img src={user.photoURL} alt="User" className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 ${userProfile?.role === 'admin' ? 'border-amber-400' : 'border-slate-100'}`} referrerPolicy="no-referrer" />
                  {userProfile?.role === 'admin' && (
                    <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-0.5 rounded-full border border-white">
                      <Trophy size={10} />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 ${userProfile?.role === 'admin' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-100 text-indigo-600 border-indigo-50'}`}>
                  {userProfile?.role === 'admin' ? <Trophy size={20} /> : <UserIcon size={20} />}
                </div>
              )}

              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {view === 'admin' && userProfile?.role === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Trophy className="text-amber-500" /> Painel de Administração
                  </h1>
                  <p className="text-slate-500 text-sm">Gestão de progresso e conteúdo automatizado</p>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl self-start sm:self-center">
                  <button 
                    onClick={() => setAdminTab('progress')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === 'progress' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <TrendingUp size={16} /> Alunos
                  </button>
                  <button 
                    onClick={() => setAdminTab('content')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === 'content' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <BrainCircuit size={16} /> Conteúdo IA
                  </button>
                </div>
              </div>

              {adminTab === 'progress' ? <AdminDashboard /> : <ContentManager />}
            </motion.div>
          )}

          {/* HOME VIEW */}
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center py-8"
            >
              <div className="bg-indigo-100 p-3 sm:p-4 rounded-full text-indigo-600 mb-6">
                <GraduationCap size={40} className="sm:w-[48px] sm:h-[48px]" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4 px-4">
                Plataforma de Revisão Pedagógica
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mb-8 sm:mb-12 px-6">
                Selecione um dos módulos abaixo para iniciar sua jornada de revisão teórica e simulados práticos.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl px-2">
                {(Object.entries(MODULES) as [ModuleId, typeof MODULES['eval']][]).map(([id, mod]) => (
                  <div key={id} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className={`p-5 sm:p-6 text-white ${id === 'eval' ? 'bg-indigo-600' : 'bg-violet-600'}`}>
                      <h3 className="text-lg sm:text-xl font-bold mb-1">{mod.title}</h3>
                      <p className="text-xs sm:text-sm text-white/80">{mod.desc}</p>
                    </div>
                    <div className="p-4 sm:p-6 grid grid-cols-2 gap-3 sm:gap-4">
                      <button 
                        onClick={() => startReview(id)}
                        className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all group"
                      >
                        <BookOpen size={20} className="text-indigo-600 group-hover:scale-110 transition-transform sm:w-[24px] sm:h-[24px]" />
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Revisão</span>
                      </button>
                      <button 
                        onClick={() => startQuiz(id)}
                        className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-slate-50 transition-all group"
                      >
                        <Layout size={20} className="text-emerald-600 group-hover:scale-110 transition-transform sm:w-[24px] sm:h-[24px]" />
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Simulado</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* REVIEW VIEW */}
          {view === 'review' && selectedModule && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="text-indigo-600" size={24} />
                    {MODULES[selectedModule].title}
                  </h2>
                  <p className="text-slate-500 text-sm">Tópico {currentTopicIndex + 1} de {filteredTopics.length}</p>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <button 
                    disabled={currentTopicIndex === 0}
                    onClick={() => setCurrentTopicIndex(prev => prev - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft />
                  </button>
                  <button 
                    disabled={currentTopicIndex === filteredTopics.length - 1}
                    onClick={() => setCurrentTopicIndex(prev => prev + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className={`p-5 sm:p-6 text-white ${selectedModule === 'eval' ? 'bg-indigo-600' : 'bg-violet-600'}`}>
                  <h3 className="text-lg sm:text-xl font-bold">{filteredTopics[currentTopicIndex].title}</h3>
                </div>
                <div className="p-5 sm:p-8">
                  <div className="max-w-none">
                    <p className="text-base sm:text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {filteredTopics[currentTopicIndex].content}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col xs:flex-row justify-between items-center bg-slate-100 p-3 sm:p-4 rounded-2xl gap-3">
                <button 
                  onClick={() => { setView('home'); setSelectedModule(null); }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm sm:text-base"
                >
                  Mudar Módulo
                </button>
                {currentTopicIndex === filteredTopics.length - 1 ? (
                  <button 
                    onClick={() => setView('quiz')}
                    className="w-full xs:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Ir para Simulado <ArrowRight size={18} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentTopicIndex(prev => prev + 1)}
                    className="w-full xs:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Próximo Tópico
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* QUIZ VIEW */}
          {view === 'quiz' && selectedModule && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="py-6"
            >
              {/* Question Navigator Grid */}
              <div className="mb-6 overflow-x-auto pb-2">
                <div className="flex gap-2 min-w-max">
                  {filteredQuestions.map((q, idx) => {
                    const status = answers[q.id] !== undefined 
                      ? (answers[q.id] === q.correctAnswer ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-rose-500 text-white border-rose-500')
                      : (currentQuestionIndex === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200');
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${status} ${currentQuestionIndex === idx ? 'ring-2 ring-indigo-200 ring-offset-2' : ''}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <h2 className="text-xl font-bold text-slate-900">Simulado: {MODULES[selectedModule].title}</h2>
                  <span className="text-slate-500 font-mono text-sm">
                    Questão {currentQuestionIndex + 1}/{filteredQuestions.length}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / filteredQuestions.length) * 100}%` }}
                    className="h-full bg-indigo-600"
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-10 mb-6">
                <div className="flex items-center gap-2 text-indigo-600 mb-4 bg-indigo-50 w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Info size={12} className="sm:w-[14px] sm:h-[14px]" />
                  {filteredQuestions[currentQuestionIndex].block}
                </div>
                
                <h3 className="text-lg sm:text-2xl font-bold text-slate-800 mb-6 sm:mb-8 leading-snug">
                  {filteredQuestions[currentQuestionIndex].text}
                </h3>

                <div className="space-y-2 sm:space-y-3">
                  {filteredQuestions[currentQuestionIndex].options.map((option, idx) => {
                    const studentAnswer = answers[filteredQuestions[currentQuestionIndex].id];
                    const isSelected = studentAnswer === idx;
                    const isCorrect = idx === filteredQuestions[currentQuestionIndex].correctAnswer;
                    const hasAnswered = studentAnswer !== undefined;
                    
                    let bgClass = "bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-white";
                    if (hasAnswered) {
                      if (isCorrect) bgClass = "bg-emerald-50 border-emerald-500 text-emerald-900";
                      else if (isSelected) bgClass = "bg-rose-50 border-rose-500 text-rose-900";
                      else bgClass = "bg-slate-50 border-slate-200 opacity-50";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={hasAnswered}
                        onClick={() => handleAnswer(filteredQuestions[currentQuestionIndex].id, idx)}
                        className={`w-full text-left p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all flex items-start gap-3 sm:gap-4 ${bgClass}`}
                      >
                        <span className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs sm:text-sm ${isSelected ? 'border-current' : 'border-slate-300'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm sm:text-lg flex-grow py-0.5">{option}</span>
                        {hasAnswered && isCorrect && <CheckCircle2 className="text-emerald-500 mt-1" size={20} />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {answers[filteredQuestions[currentQuestionIndex].id] !== undefined && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-8 p-6 border-2 rounded-2xl ${
                      answers[filteredQuestions[currentQuestionIndex].id] === filteredQuestions[currentQuestionIndex].correctAnswer 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-rose-50 border-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {answers[filteredQuestions[currentQuestionIndex].id] === filteredQuestions[currentQuestionIndex].correctAnswer ? (
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                          <CheckCircle2 size={20} />
                          <span>Resposta Correta!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-700 font-bold">
                          <Info size={20} />
                          <span>Não foi dessa vez.</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                        {answers[filteredQuestions[currentQuestionIndex].id] === filteredQuestions[currentQuestionIndex].correctAnswer 
                          ? `Parabéns! Você identificou corretamente que a alternativa "${String.fromCharCode(65 + filteredQuestions[currentQuestionIndex].correctAnswer)}" é a resposta certa.`
                          : `Você marcou a alternativa "${String.fromCharCode(65 + (answers[filteredQuestions[currentQuestionIndex].id] ?? 0))}", mas a correta é a "${String.fromCharCode(65 + filteredQuestions[currentQuestionIndex].correctAnswer)}".`}
                      </p>
                      <div className="p-4 bg-white/50 rounded-xl border border-white">
                        <p className="text-slate-600 text-sm leading-relaxed italic">
                          <span className="font-bold text-slate-800 not-italic block mb-1">Por que esta é a correta?</span>
                          {filteredQuestions[currentQuestionIndex].explanation || 
                           `Esta questão de ${filteredQuestions[currentQuestionIndex].block} exige a compreensão dos marcos regulatórios e teóricos apresentados nos textos base. Releia o tópico de revisão correspondente para consolidar este ponto.`}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={20} /> Anterior
                  </button>
                  <button 
                    disabled={currentQuestionIndex === filteredQuestions.length - 1}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
                  >
                    Próximo <ChevronRight size={20} />
                  </button>
                </div>

                {Object.keys(answers).length === filteredQuestions.length && (
                  <button 
                    onClick={finalizeQuiz}
                    className="w-full sm:w-auto px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all transform hover:scale-105"
                  >
                    Finalizar Simulado
                  </button>
                )}
              </div>

              <div className="mt-8 flex justify-center text-slate-500">
                <button 
                  onClick={() => { setView('home'); setSelectedModule(null); }}
                  className="text-sm font-medium hover:text-slate-900 flex items-center gap-1 border-b border-transparent hover:border-slate-400 transition-all"
                >
                  Sair do Quiz
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULTS VIEW */}
          {view === 'results' && selectedModule && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="py-12 flex flex-col items-center"
            >
              <div className="relative mb-6 sm:mb-8">
                <div className="absolute inset-0 bg-indigo-200 blur-2xl rounded-full opacity-50 animate-pulse"></div>
                <div className="relative bg-white p-6 sm:p-8 rounded-full border-4 border-indigo-600 text-indigo-600">
                  <Trophy size={48} className="sm:w-[64px] sm:h-[64px]" />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Resultado Final</h2>
              <p className="text-slate-500 mb-6 sm:mb-8 text-center px-4">Simulado: {MODULES[selectedModule].title}</p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-sm mb-8 sm:mb-12 px-4">
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 text-center shadow-sm">
                  <div className="text-3xl sm:text-4xl font-black text-indigo-600 mb-1">{score}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Acertos</div>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 text-center shadow-sm">
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">{Math.round((score / filteredQuestions.length) * 100)}%</div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Precisão</div>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl w-full max-w-lg mb-12 text-center">
                <h4 className="font-bold text-indigo-800 mb-2 flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} />
                  Performance
                </h4>
                <p className="text-indigo-700 text-sm leading-relaxed">
                  {score >= (filteredQuestions.length * 0.9) ? "Excelente! Você demonstra domínio absoluto deste módulo." : 
                   score >= (filteredQuestions.length * 0.7) ? "Bom desempenho. Você compreende bem os conceitos fundamentais." : 
                   "Continue estudando! Recomendamos rever a revisão teórica deste módulo."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg px-4">
                <button 
                  onClick={resetQuiz}
                  className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  <RotateCcw size={20} /> Refazer Simulado
                </button>
                <button 
                  onClick={() => { setView('home'); setSelectedModule(null); }}
                  className="w-full bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <Home size={20} /> Outros Módulos
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 py-8 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">
          EduReview © 2024 - Plataforma de Estudo e Revisão
        </p>
      </footer>
    </div>
  );
}
