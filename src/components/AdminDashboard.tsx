import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  FileText, 
  PlusCircle, 
  TrendingUp, 
  ChevronRight, 
  Search,
  BookOpen,
  Layout,
  RefreshCw,
  Clock
} from 'lucide-react';
import { getStudentsProgress, StudentProgressData } from '../services/adminService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const data = await getStudentsProgress();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const filteredStudents = students.filter(s => 
    s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = students.slice(0, 10).map(s => ({
    name: s.displayName.split(' ')[0],
    score: s.avgScore
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{students.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alunos Ativos</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.avgScore, 0) / students.length) : 0}%
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Média Geral</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {students.reduce((acc, s) => acc + s.totalAttempts, 0)}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Simulados</div>
          </div>
        </motion.div>
      </div>

      {/* Progress Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-900">Performance: Top 10 Alunos</h3>
          <button onClick={fetchProgress} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <RefreshCw size={20} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#10b981' : entry.score > 40 ? '#6366f1' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Student List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-900">Lista de Estudantes</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-all text-sm w-full sm:w-64"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Precisão Média</th>
                <th className="px-6 py-4">Qtd. Tentativas</th>
                <th className="px-6 py-4">Última Atividade</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.userId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{student.displayName}</div>
                    <div className="text-xs text-slate-400">{student.userEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${student.avgScore > 70 ? 'bg-emerald-500' : student.avgScore > 40 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                          style={{ width: `${student.avgScore}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-600">{student.avgScore}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">
                      {student.totalAttempts}x
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {student.lastAttempt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {loading ? 'Carregando dados...' : 'Nenhum estudante encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
