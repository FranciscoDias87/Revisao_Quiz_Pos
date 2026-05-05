import { useState, useMemo } from 'react';
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
  Info
} from 'lucide-react';
import { reviewTopics } from './data/content';
import { quizQuestions } from './data/questions';

type View = 'home' | 'review' | 'quiz' | 'results';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showFeedback, setShowFeedback] = useState<number | null>(null);

  const score = useMemo(() => {
    return Object.entries(answers).reduce((acc, [qId, answerIndex]) => {
      const question = quizQuestions.find(q => q.id === parseInt(qId));
      return question && question.correctAnswer === answerIndex ? acc + 1 : acc;
    }, 0);
  }, [answers]);

  const handleAnswer = (questionId: number, optionIndex: number) => {
    if (showFeedback !== null) return;
    
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    setShowFeedback(optionIndex);

    setTimeout(() => {
      setShowFeedback(null);
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setView('results');
      }
    }, 1200);
  };

  const resetQuiz = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setView('quiz');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setView('home')}
        >
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform">
            <GraduationCap size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight">EduReview</span>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setView('review')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${view === 'review' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            <BookOpen size={18} />
            <span className="hidden sm:inline">Revisão</span>
          </button>
          <button 
            onClick={() => setView('quiz')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${view === 'quiz' || view === 'results' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            <Layout size={18} />
            <span className="hidden sm:inline">Simulado</span>
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {/* HOME VIEW */}
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center py-12"
            >
              <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-6">
                <GraduationCap size={48} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
                Paradigmas da Avaliação da Aprendizagem
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mb-12">
                Aprofunde seus conhecimentos sobre currículo, avaliação e políticas educacionais brasileiras através desta revisão teórica e simulado completo.
              </p>

              <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
                <button 
                  onClick={() => setView('review')}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col group"
                >
                  <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 w-fit mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="font-bold text-xl mb-2">Revisão Teórica</h3>
                  <p className="text-slate-500 text-sm flex-grow">
                    6 blocos de conteúdo fundamentados nos paradigmas de avaliação e LDB.
                  </p>
                  <div className="mt-4 flex items-center text-indigo-600 font-semibold gap-1">
                    Começar leitura <ArrowRight size={16} />
                  </div>
                </button>

                <button 
                  onClick={() => setView('quiz')}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col group"
                >
                  <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Layout size={24} />
                  </div>
                  <h3 className="font-bold text-xl mb-2">Simulado Completo</h3>
                  <p className="text-slate-500 text-sm flex-grow">
                    50 questões inéditas divididas por blocos temáticos conforme o conteúdo.
                  </p>
                  <div className="mt-4 flex items-center text-emerald-600 font-semibold gap-1">
                    Iniciar quiz <ArrowRight size={16} />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* REVIEW VIEW */}
          {view === 'review' && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="text-indigo-600" />
                    Revisão Teórica
                  </h2>
                  <p className="text-slate-500 text-sm">Aula {currentTopicIndex + 1} de {reviewTopics.length}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={currentTopicIndex === 0}
                    onClick={() => setCurrentTopicIndex(prev => prev - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronLeft />
                  </button>
                  <button 
                    disabled={currentTopicIndex === reviewTopics.length - 1}
                    onClick={() => setCurrentTopicIndex(prev => prev + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="bg-indigo-600 p-6 text-white">
                  <h3 className="text-xl font-bold">{reviewTopics[currentTopicIndex].title}</h3>
                </div>
                <div className="p-8">
                  <div className="prose prose-slate max-w-none">
                    <p className="text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {reviewTopics[currentTopicIndex].content}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-100 p-4 rounded-2xl">
                <button 
                  onClick={() => setView('home')}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Voltar ao Início
                </button>
                {currentTopicIndex === reviewTopics.length - 1 ? (
                  <button 
                    onClick={() => setView('quiz')}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    Ir para o Simulado <ArrowRight size={18} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentTopicIndex(prev => prev + 1)}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Próximo Bloco
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* QUIZ VIEW */}
          {view === 'quiz' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="py-6"
            >
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <h2 className="text-xl font-bold text-slate-900">Simulado</h2>
                  <span className="text-slate-500 font-mono text-sm">
                    {currentQuestionIndex + 1}/{quizQuestions.length}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                    className="h-full bg-indigo-600"
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10">
                <div className="flex items-center gap-2 text-indigo-600 mb-4 bg-indigo-50 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Info size={14} />
                  {quizQuestions[currentQuestionIndex].block}
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-8 leading-snug">
                  {quizQuestions[currentQuestionIndex].text}
                </h3>

                <div className="space-y-3">
                  {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                    const isSelected = showFeedback === idx;
                    const isCorrect = idx === quizQuestions[currentQuestionIndex].correctAnswer;
                    
                    let bgClass = "bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-white";
                    if (showFeedback !== null) {
                      if (isCorrect) bgClass = "bg-emerald-50 border-emerald-500 text-emerald-900";
                      else if (isSelected) bgClass = "bg-rose-50 border-rose-500 text-rose-900";
                      else bgClass = "bg-slate-50 border-slate-200 opacity-50";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={showFeedback !== null}
                        onClick={() => handleAnswer(quizQuestions[currentQuestionIndex].id, idx)}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${bgClass}`}
                      >
                        <span className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${isSelected ? 'border-current' : 'border-slate-300'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-base sm:text-lg">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center text-slate-500 px-2">
                <p className="text-sm">Clique na opção correta para avançar automaticamente.</p>
                <button 
                  onClick={() => setView('home')}
                  className="text-sm font-medium hover:text-slate-900 flex items-center gap-1"
                >
                  Sair do Quiz
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULTS VIEW */}
          {view === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="py-12 flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-200 blur-2xl rounded-full opacity-50 animate-pulse"></div>
                <div className="relative bg-white p-8 rounded-full border-4 border-indigo-600 text-indigo-600">
                  <Trophy size={64} />
                </div>
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Resultado Final</h2>
              <p className="text-slate-500 mb-8">Você concluiu o simulado de 50 questões.</p>

              <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-12">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center">
                  <div className="text-4xl font-black text-indigo-600 mb-1">{score}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Acertos</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center">
                  <div className="text-4xl font-black text-slate-900 mb-1">{Math.round((score / quizQuestions.length) * 100)}%</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Precisão</div>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl w-full max-w-lg mb-12">
                <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Feedback de Estudo
                </h4>
                <p className="text-indigo-700 text-sm leading-relaxed">
                  {score >= 45 ? "Excelente! Você demonstra domínio absoluto dos temas de avaliação e legislação. Está pronto para o exame!" : 
                   score >= 35 ? "Bom desempenho. Você compreende bem os conceitos, mas uma revisão rápida nos blocos onde teve dúvida pode ajudar a consolidar." : 
                   "O conteúdo é denso e histórico. Recomendamos reler a seção de revisão e refazer o quiz para fixar os marcos regulatórios e pedagógicos."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                <button 
                  onClick={resetQuiz}
                  className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  <RotateCcw size={20} /> Tentar Novamente
                </button>
                <button 
                  onClick={() => setView('home')}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <Home size={20} /> Voltar ao Início
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 py-8 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">
          EduReview © 2024 - Paradigmas da Avaliação da Aprendizagem
        </p>
      </footer>
    </div>
  );
}
