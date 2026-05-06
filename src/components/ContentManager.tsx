import React, { useState, useRef } from 'react';
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
  Plus
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { generateContentFromText, saveGeneratedContent, GeneratedTopic, GeneratedQuestion } from '../services/aiService';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const ContentManager: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState('eval');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'generating' | 'reviewing' | 'saving' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  
  const [generatedTopic, setGeneratedTopic] = useState<GeneratedTopic | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="flex items-center gap-3 text-indigo-600 mb-6">
          <BrainCircuit size={32} />
          <h2 className="text-2xl font-bold">Ingestão de Conteúdo (AI)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Configuration */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Módulo de Destino</label>
              <select 
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-all font-medium"
              >
                <option value="eval">Avaliação da Aprendizagem</option>
                <option value="disorders">Distúrbios de Aprendizagem</option>
              </select>
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
              <li>3. São geradas **3 Questões de Simulado** exclusivas.</li>
              <li>4. Você revisa e aprova a inserção no banco de dados.</li>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {generatedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-black text-indigo-600 uppercase mb-2">Questão {idx + 1}</div>
                  <p className="text-sm font-bold text-slate-800 mb-4 line-clamp-3">{q.text}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`text-xs p-2 rounded-lg border ${i === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 font-bold text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                        {String.fromCharCode(65 + i)}) {opt}
                      </div>
                    ))}
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
