import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  FileText, 
  BrainCircuit, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2,
  Save,
  Plus,
  FolderPlus,
  X,
  HelpCircle,
  FileQuestion
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { generateContentFromText, saveGeneratedContent, GeneratedTopic, GeneratedQuestion } from '../services/aiService';
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Set up PDF.js worker using unpkg which is more reliable
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const ContentManager: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState('eval');
  const [modules, setModules] = useState<{id: string, title: string}[]>([
    { id: 'eval', title: 'Avaliação da Aprendizagem' },
    { id: 'disorders', title: 'Distúrbios de Aprendizagem' }
  ]);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'generating' | 'reviewing' | 'saving' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  
  const [generatedTopic, setGeneratedTopic] = useState<GeneratedTopic | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchModules = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'modules'));
        const dynamicModules = querySnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title
        }));
        setModules(prev => {
          const staticIds = ['eval', 'disorders'];
          // Avoid duplication if useEffect runs twice
          const filteredDynamic = dynamicModules.filter(dm => !prev.some(p => p.id === dm.id));
          return [...prev, ...filteredDynamic];
        });
      } catch (err) {
        console.error("Error fetching modules:", err);
      }
    };
    fetchModules();
  }, []);

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim() || !newModuleDesc.trim()) return;
    
    try {
      setStatus('saving');
      const docRef = await addDoc(collection(db, 'modules'), {
        title: newModuleTitle.trim(),
        desc: newModuleDesc.trim(),
        icon: 'book',
        createdAt: serverTimestamp()
      });
      
      const newMod = { id: docRef.id, title: newModuleTitle.trim() };
      setModules(prev => [...prev, newMod]);
      setSelectedModule(docRef.id);
      setIsCreatingModule(false);
      setNewModuleTitle('');
      setNewModuleDesc('');
      setStatus('idle');
    } catch (err) {
      console.error("Error creating module:", err);
      setError('Erro ao criar módulo.');
      setStatus('idle');
    }
  };

  const handleDeleteModule = async (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (['eval', 'disorders'].includes(moduleId)) {
      alert("Módulos padrão não podem ser removidos.");
      return;
    }

    if (!confirm("Tem certeza que deseja remover este módulo?")) return;

    try {
      await deleteDoc(doc(db, 'modules', moduleId));
      setModules(prev => prev.filter(m => m.id !== moduleId));
      if (selectedModule === moduleId) setSelectedModule('eval');
    } catch (err) {
      console.error("Error deleting module:", err);
      setError('Erro ao remover módulo.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const parsePDF = async () => {
    if (!file) return;
    setStatus('parsing');
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit to 10 pages for demo
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }

      if (fullText.trim().length < 100) {
        throw new Error('O PDF parece estar vazio ou não foi possível extrair o texto.');
      }

      setExtractedText(fullText);
      generateAIContent(fullText);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar PDF.');
      setStatus('idle');
    }
  };

  const generateAIContent = async (text: string) => {
    setStatus('generating');
    try {
      const { generatedTopic, generatedQuestions } = await generateContentFromText(text, selectedModule);
      setGeneratedTopic(generatedTopic);
      setGeneratedQuestions(generatedQuestions);
      setStatus('reviewing');
    } catch (err: any) {
      setError('Erro ao gerar conteúdo com IA.');
      setStatus('idle');
    }
  };

  const handleSave = async () => {
    if (!generatedTopic) return;
    setStatus('saving');
    try {
      await saveGeneratedContent(selectedModule, generatedTopic, generatedQuestions);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setFile(null);
        setGeneratedTopic(null);
        setGeneratedQuestions([]);
      }, 3000);
    } catch (err: any) {
      setError('Erro ao salvar no banco de dados.');
      setStatus('reviewing');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <BrainCircuit size={32} />
            <h2 className="text-2xl font-bold">Ingestão de Conteúdo (AI)</h2>
          </div>
          <button 
            onClick={() => setIsCreatingModule(!isCreatingModule)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
          >
            <FolderPlus size={18} /> {isCreatingModule ? 'Cancelar' : 'Novo Módulo'}
          </button>
        </div>

        <AnimatePresence>
          {isCreatingModule && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
            >
              <h3 className="font-bold text-slate-900">Criar Novo Módulo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Título do Módulo"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 font-medium"
                />
                <input 
                  type="text" 
                  placeholder="Breve Descrição"
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 font-medium"
                />
              </div>
              <button 
                onClick={handleCreateModule}
                disabled={!newModuleTitle.trim() || !newModuleDesc.trim() || status === 'saving'}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {status === 'saving' ? 'Criando...' : 'Criar e Selecionar'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Configuration */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Módulo de Destino</label>
              <div className="flex gap-2">
                <select 
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-all font-medium"
                >
                  {modules.map(mod => (
                    <option key={mod.id} value={mod.id}>{mod.title}</option>
                  ))}
                </select>
                {selectedModule !== 'eval' && selectedModule !== 'disorders' && (
                  <button 
                    onClick={(e) => handleDeleteModule(selectedModule, e)}
                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all border border-red-100"
                    title="Remover Módulo"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Arquivo PDF</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${file ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf" 
                  className="hidden" 
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="text-indigo-600" size={32} />
                    <span className="font-bold text-slate-700 truncate max-w-xs">{file.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-rose-500 font-bold hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <FileUp size={32} />
                    <span className="font-medium">Clique para selecionar PDF</span>
                    <span className="text-xs">Máximo 10 páginas sugerido</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              disabled={!file || status !== 'idle'}
              onClick={parsePDF}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              {status === 'parsing' || status === 'generating' ? (
                <> <Loader2 className="animate-spin" /> Processando com IA... </>
              ) : (
                <> <BrainCircuit size={20} /> Gerar Revisão e Questões </>
              )}
            </button>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-indigo-600" size={18} />
              Como funciona?
            </h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>1. Carregue um documento PDF com conteúdo teórico.</li>
              <li>2. A IA extrai o texto e cria um **Tópico de Revisão** formatado.</li>
              <li>3. São geradas **30 Questões Contextualizadas** exclusivas.</li>
              <li>4. Híbrido: **V/F, Múltipla Escolha e Subjetivas**.</li>
              <li>5. Você revisa e aprova a inserção no banco de dados.</li>
            </ul>
            <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Poder de processamento</p>
              <div className="flex gap-1 h-1">
                <div className="flex-1 bg-indigo-600 rounded-full"></div>
                <div className="flex-1 bg-indigo-400 rounded-full"></div>
                <div className="flex-1 bg-indigo-200 rounded-full"></div>
                <div className="flex-1 bg-slate-200 rounded-full"></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Utilizando Gemini 3 Flash para análise semântica.</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(status === 'reviewing' || status === 'saving' || status === 'success') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Topic Review */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <CheckCircle2 /> Revisão: {generatedTopic?.title}
                </h3>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">Gerado pela IA</span>
              </div>
              <div className="p-8 prose prose-slate max-w-none">
                <p className="text-lg text-slate-700 whitespace-pre-wrap">{generatedTopic?.content}</p>
              </div>
            </div>

            {/* Questions Review */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] font-black text-indigo-600 uppercase">Questão {idx + 1}</div>
                    <div className="bg-slate-100 text-slate-500 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase">
                      {q.type === 'objective' ? 'Objetiva' : q.type === 'true_false' ? 'V/F' : 'Subjetiva'}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-4 flex-1">{q.text}</p>
                  
                  {q.type !== 'subjective' ? (
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`text-[10px] sm:text-xs p-2 rounded-lg border flex items-center gap-2 ${i === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 font-bold text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                          <span className="w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[8px]">{String.fromCharCode(65 + i)}</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 text-xs italic text-slate-500">
                      Resposta aberta sugerida na explicação abaixo.
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <p className="text-[10px] text-emerald-600 font-bold mb-1 flex items-center gap-1">
                      <HelpCircle size={10} /> Explicação:
                    </p>
                    <p className="text-[10px] text-slate-500 italic leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-center">
              <button 
                disabled={status === 'saving' || status === 'success'}
                onClick={handleSave}
                className={`px-12 py-4 rounded-2xl font-bold text-white shadow-xl flex items-center gap-3 transition-all ${status === 'success' ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}`}
              >
                {status === 'saving' ? <Loader2 className="animate-spin" /> : status === 'success' ? <CheckCircle2 /> : <Save />}
                {status === 'saving' ? 'Salvando...' : status === 'success' ? 'Salvo com Sucesso!' : 'Aprovar e Publicar Conteúdo'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
