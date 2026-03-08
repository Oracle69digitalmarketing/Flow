import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Slack, 
  Globe, 
  TrendingUp, 
  Users, 
  FileText, 
  Zap, 
  Search,
  Send,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  Play,
  Settings,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  probability: number;
}

interface Conversation {
  id: string;
  platform: string;
  content: string;
  direction: string;
  timestamp: string;
}

interface BrowserSession {
  id: string;
  url: string;
  title: string;
  is_competitor: number;
  visited_at: string;
}

interface Document {
  id: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
}

interface Workflow {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  is_active: number;
}

export default function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [browserSessions, setBrowserSessions] = useState<BrowserSession[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'whatsapp' | 'slack' | 'browser' | 'workflows' | 'documents' | 'pipeline'>('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/context/user_1');
      const data = await res.json();
      setDeals(data.deals);
      setConversations(data.conversations);
      setBrowserSessions(data.browser);
      setDocuments(data.documents);
      setWorkflows(data.workflows);
    } catch (err) {
      console.error('Failed to fetch context', err);
    }
  };

  const syncDeals = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/deals/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_1' })
      });
      fetchData();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, aiResponse]);

  const handleAskFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAsking(true);
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, platform: 'dashboard' })
      });
      const data = await res.json();
      setAiResponse(data.text);
      setQuery('');
      fetchData();
    } catch (err) {
      console.error('AI Query failed', err);
    } finally {
      setIsAsking(false);
    }
  };

  const generateDoc = async (type: 'proposal' | 'battlecard', competitorName?: string) => {
    if (deals.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dealId: deals[0].id, 
          type, 
          competitorName: competitorName || 'Competitor X' 
        })
      });
      const data = await res.json();
      fetchData();
      setActiveTab('documents');
      setSelectedDoc(data);
    } catch (err) {
      console.error('Generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const createWorkflow = async () => {
    try {
      await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'Competitor Price Alert', 
          triggerType: 'competitor_change', 
          actionType: 'whatsapp_notify' 
        })
      });
      fetchData();
    } catch (err) {
      console.error('Workflow creation failed', err);
    }
  };

  const filteredConversations = conversations.filter(c => 
    activeTab === 'all' ? true : c.platform === activeTab
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://storage.googleapis.com/static-content-ais-prod/user_content/rlp4mi36mfpglv35hnby4z/62/logo.png" 
            alt="Flow Logo" 
            className="h-10 w-auto"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = "flex items-center gap-3";
                fallback.innerHTML = `
                  <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap text-white w-6 h-6"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
                  </div>
                  <div>
                    <h1 class="text-xl font-bold tracking-tight">FLOW</h1>
                    <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Mission Control</p>
                  </div>
                `;
                parent.appendChild(fallback);
              }
            }}
          />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-500">
            <button onClick={() => setActiveTab('all')} className={`hover:text-indigo-600 transition-colors ${activeTab === 'all' ? 'text-indigo-600' : ''}`}>Feed</button>
            <button onClick={() => setActiveTab('pipeline')} className={`hover:text-indigo-600 transition-colors ${activeTab === 'pipeline' ? 'text-indigo-600' : ''}`}>Pipeline</button>
            <button onClick={() => setActiveTab('workflows')} className={`hover:text-indigo-600 transition-colors ${activeTab === 'workflows' ? 'text-indigo-600' : ''}`}>Workflows</button>
            <button onClick={() => setActiveTab('documents')} className={`hover:text-indigo-600 transition-colors ${activeTab === 'documents' ? 'text-indigo-600' : ''}`}>Documents</button>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-sm" />
        </div>
      </nav>

      {/* Live Intelligence Ticker */}
      <div className="bg-indigo-900 text-white py-2 px-6 overflow-hidden whitespace-nowrap border-y border-indigo-800">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex gap-12 text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          {browserSessions.filter(s => s.is_competitor === 1).map(s => (
            <span key={s.id} className="flex items-center gap-2"><Zap size={12} className="text-yellow-400" /> Competitor detected: {s.title} ({new URL(s.url).hostname})</span>
          ))}
          {deals.map(d => (
            <span key={d.id} className="flex items-center gap-2"><TrendingUp size={12} className="text-green-400" /> {d.name} deal probability: {d.probability}%</span>
          ))}
          {conversations.slice(0, 3).map(c => (
            <span key={c.id} className="flex items-center gap-2"><Users size={12} className="text-blue-400" /> New {c.platform} activity: {c.content.substring(0, 30)}...</span>
          ))}
        </motion.div>
      </div>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Main Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Platform Tabs */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-fit">
            {(['all', 'whatsapp', 'slack', 'browser', 'workflows', 'documents', 'pipeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Main Feed / Content Area */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {activeTab === 'pipeline' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Discovery', 'Proposal', 'Negotiation'].map(stage => (
                    <div key={stage} className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stage}</h3>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {deals.filter(d => d.stage === stage).length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {deals.filter(d => d.stage === stage).map(deal => (
                          <div key={deal.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                            <h4 className="font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">{deal.name}</h4>
                            <div className="flex items-center justify-between text-xs mb-3">
                              <span className="text-gray-500">${deal.amount.toLocaleString()}</span>
                              <span className="font-bold text-indigo-600">{deal.probability}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${deal.probability}%` }} />
                            </div>
                          </div>
                        ))}
                        {deals.filter(d => d.stage === stage).length === 0 && (
                          <div className="border-2 border-dashed border-gray-100 rounded-3xl h-24 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Empty Stage</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : activeTab === 'workflows' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold">Automated Workflows</h2>
                    <button onClick={createWorkflow} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
                      <Plus size={16} /> New Workflow
                    </button>
                  </div>
                  {workflows.length === 0 && (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                      <Settings className="mx-auto text-gray-300 mb-4" size={48} />
                      <p className="text-gray-500 font-medium">No workflows active. Create one to automate your deal intelligence.</p>
                    </div>
                  )}
                  {workflows.map(wf => (
                    <div key={wf.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                          <Zap size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{wf.name}</h3>
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Trigger: {wf.trigger_type} • Action: {wf.action_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-6 rounded-full relative transition-colors ${wf.is_active ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${wf.is_active ? 'left-7' : 'left-1'}`} />
                        </div>
                        <MoreVertical size={20} className="text-gray-300 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : activeTab === 'documents' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => setSelectedDoc(doc)}
                      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${doc.type === 'battlecard' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          <FileText size={24} />
                        </div>
                        <FileDown size={20} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <h3 className="font-bold text-gray-800 mb-1">{doc.title}</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                      <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                      <p className="text-gray-500 font-medium">No documents generated yet. Ask Flow to create a proposal or battlecard.</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                filteredConversations.map((msg) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={msg.id}
                    className={`group relative bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all ${
                      msg.direction === 'outgoing' ? 'border-l-4 border-l-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        msg.platform === 'whatsapp' ? 'bg-emerald-50 text-emerald-600' :
                        msg.platform === 'slack' ? 'bg-purple-50 text-purple-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {msg.platform === 'whatsapp' ? <MessageSquare size={20} /> :
                         msg.platform === 'slack' ? <Slack size={20} /> :
                         <Globe size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {msg.platform} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <MoreVertical size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                        </div>
                        <p className="text-[15px] leading-relaxed text-gray-700">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* AI Interaction Area */}
          <div className="sticky bottom-6">
            <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-indigo-50">
              {aiResponse && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-6 bg-indigo-600 rounded-[2rem] text-white shadow-inner relative overflow-hidden"
                >
                  <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <Zap size={12} className="fill-white" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80">Flow Intelligence</span>
                    </div>
                    <p className="text-lg font-medium leading-snug whitespace-pre-wrap">
                      {aiResponse}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => generateDoc('battlecard')} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors">Generate Battlecard</button>
                      <button onClick={() => generateDoc('proposal')} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors">Draft Proposal</button>
                      <button onClick={() => setAiResponse('')} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors">Dismiss</button>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <form onSubmit={handleAskFlow} className="relative flex items-center">
                <div className="absolute left-4 text-indigo-500">
                  {isAsking ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" /> : <Search size={20} />}
                </div>
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask Flow about your deals, competitors, or next steps..."
                  className="w-full pl-12 pr-16 py-4 bg-gray-50 border-none rounded-[2rem] focus:ring-2 focus:ring-indigo-500 transition-all text-gray-700 placeholder:text-gray-400"
                />
                <button 
                  type="submit"
                  disabled={isAsking || !query.trim()}
                  className="absolute right-2 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Deal Context & Browser Activity */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Deals Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                <h2 className="font-bold text-sm uppercase tracking-wider text-gray-500">Active Deals</h2>
              </div>
              <button 
                onClick={syncDeals}
                disabled={isSyncing}
                className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                {isSyncing ? <div className="animate-spin rounded-full h-2 w-2 border border-indigo-600 border-t-transparent" /> : <Clock size={10} />}
                SYNC
              </button>
            </div>
            <div className="p-2">
              {deals.map(deal => (
                <div key={deal.id} className="p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{deal.name}</h3>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>${deal.amount.toLocaleString()}</span>
                    <span className="font-semibold text-indigo-600">{deal.stage}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${deal.probability}%` }}
                      className="h-full bg-indigo-500 rounded-full" 
                    />
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex justify-between">
                    <span>{deal.probability}% Probability</span>
                    <span className="opacity-50">Synced {new Date((deal as any).last_synced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Browser Context Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center gap-2">
              <Globe size={18} className="text-blue-500" />
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-500">Browser Context</h2>
            </div>
            <div className="p-2">
              {browserSessions.map(session => (
                <div key={session.id} className="p-4 hover:bg-gray-50 rounded-2xl transition-colors flex items-start gap-3">
                  <div className={`mt-1 p-1.5 rounded-lg ${session.is_competitor ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                    <Globe size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-800 truncate">{session.title}</h4>
                    <p className="text-[10px] text-gray-400 truncate mb-1">{session.url}</p>
                    {session.is_competitor === 1 && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-widest">
                        <AlertCircle size={10} /> Competitor Detected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitive Analysis Widget */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-500">Competitive Analysis</h2>
            </div>
            <div className="p-5 space-y-4">
              {browserSessions.filter(s => s.is_competitor === 1).length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {browserSessions.find(s => s.is_competitor === 1)?.title.split(' ')[0] || 'Competitor'}
                    </span>
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">HIGH THREAT</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Pricing Match</span>
                      <span className="font-bold text-red-500">-$5k/mo</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 w-[85%]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Feature Parity</span>
                      <span className="font-bold text-green-500">92%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[92%]" />
                    </div>
                  </div>
                  <button 
                    onClick={() => generateDoc('battlecard', browserSessions.find(s => s.is_competitor === 1)?.title)}
                    className="w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-xs font-bold text-gray-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={14} className="text-indigo-600" /> View Full Battlecard
                  </button>
                </>
              ) : (
                <div className="text-center py-6">
                  <Globe size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-xs text-gray-400 font-medium">No competitor activity detected yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => generateDoc('proposal')}
              disabled={isGenerating}
              className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" /> : <FileText size={20} />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Generate Proposal</span>
            </button>
            <button className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Schedule Sync</span>
            </button>
          </div>

        </div>
      </main>

      {/* Document Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-indigo-950/40 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${selectedDoc.type === 'battlecard' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedDoc.title}</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedDoc.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 prose prose-indigo max-w-none">
                <Markdown>{selectedDoc.content}</Markdown>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <button className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                  <FileDown size={18} /> Download PDF
                </button>
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200">
                  <Send size={18} /> Share with Team
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div ref={chatEndRef} />
    </div>
  );
}
