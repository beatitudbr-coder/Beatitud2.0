import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Variáveis do Supabase ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// --- INTERFACES ---
interface Lead {
  id: string | null;
  nome: string;
  instagram: string;
  segmento: string;
  origem: string;
  cargo: string;
  stage: string;
  telefone: string;
  empresa: string;
  followup: string;
  notas: string;
  criadoEm: string | null;
  fotoUrl: string;
  analiseIA: string;
  analiseCustomizadaIA?: string;
}

interface Script {
  id: string | null;
  title: string;
  stages: string[];
  text: string;
}

interface OrcamentoService {
  id: string;
  name: string;
  price: number;
  desc: string;
}

interface OrcamentoPacote {
  id: string;
  name: string;
  badge: string;
  discountPercent: number;
  items: string[];
  services: string[];
  diaria: number;
}

// --- CONSTANTES ---
const STAGES = [
  { id: 'aquecimento', label: 'Aquecimento', color: '#6B6B6B', bg: 'rgba(107,107,107,0.12)' },
  { id: 'dm_enviado', label: 'DM Enviado', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)' },
  { id: 'conversa', label: 'Conversa', color: '#C9A84C', bg: 'rgba(201,168,76,0.18)' },
  { id: 'call', label: 'Call Agendada', color: '#8B9FD4', bg: 'rgba(139,159,212,0.15)' },
  { id: 'proposta', label: 'Proposta Enviada', color: '#8B9FD4', bg: 'rgba(139,159,212,0.22)' },
  { id: 'fechado', label: 'Fechado', color: '#5BA882', bg: 'rgba(91,168,130,0.15)' },
  { id: 'perdido', label: 'Perdido', color: '#8B5555', bg: 'rgba(139,85,85,0.12)' },
];

const SEGMENTS = ['Imobiliária', 'Corretor'];
const ORIGENS = ['DM Instagram', 'WhatsApp', 'Anúncios', 'Conteúdo', 'Indicação'];
const CARGOS = ['Sócio / CEO', 'Diretor(a)', 'Gerente', 'Corretor(a)', 'Outro'];

const EMPTY_LEAD: Lead = {
  id: null,
  nome: '',
  instagram: '',
  segmento: SEGMENTS[0],
  origem: ORIGENS[0], 
  cargo: CARGOS[0],
  stage: 'aquecimento',
  telefone: '',
  empresa: '',
  followup: '',
  notas: '',
  criadoEm: null,
  fotoUrl: '', 
  analiseIA: '',
  analiseCustomizadaIA: '', 
};

const STORAGE_KEY = 'beatitud_crm_leads';
const STORAGE_KEY_SCRIPTS = 'beatitud_crm_scripts';
const STORAGE_KEY_PRICES = 'beatitud_prices';

// --- THEME & STYLES ---
const theme = {
  input: {
    width: '100%',
    background: '#0d0d0d',
    border: '1px solid #222',
    borderRadius: 6,
    padding: '9px 12px',
    fontSize: 14,
    color: '#e8e0d0',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: {
    display: 'block',
    fontSize: 11,
    color: '#666',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    marginBottom: 5,
  },
  btnOutline: {
    background: 'none',
    border: '1px solid #2a2a2a',
    color: '#888',
    borderRadius: 6,
    padding: '9px 16px',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnPrimary: {
    background: 'rgba(201,168,76,0.15)',
    border: '1px solid #C9A84C',
    color: '#C9A84C',
    borderRadius: 6,
    padding: '9px 20px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

// --- UTILS ---
const genId = () => 'ld_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
const stageOf = (id: string) => STAGES.find((s) => s.id === id) || STAGES[0];

function saveLeads(leads: Lead[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

const INITIAL_SCRIPTS: Script[] = [
  {
    id: 'sc_1',
    title: 'Primeiro Contato',
    stages: ['aquecimento'],
    text: 'Fala {nome}! Tudo bem?\n\nAcompanho o trabalho da {empresa} e curto muito a forma como vocês se posicionam.',
  },
  {
    id: 'sc_2',
    title: 'Follow-up',
    stages: ['dm_enviado', 'conversa'],
    text: 'Oi {nome}, passando só pra saber se conseguiu dar uma olhada na mensagem!',
  },
];

function loadScripts(): Script[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SCRIPTS);
    return data ? JSON.parse(data) : INITIAL_SCRIPTS;
  } catch {
    return INITIAL_SCRIPTS;
  }
}

function saveScripts(scripts: Script[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SCRIPTS, JSON.stringify(scripts));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// --- IMPORTAÇÃO E EXPORTAÇÃO ---
function exportarParaCSV(leads: Lead[]) {
  if (leads.length === 0) {
    alert("Não há leads para exportar.");
    return;
  }

  const cabecalhos = ['Nome', 'Instagram', 'Segmento', 'Origem', 'Cargo', 'Etapa', 'Telefone', 'Empresa', 'Notas'];
  
  const linhas = leads.map(l => {
    return [
      l.nome || '',
      l.instagram || '',
      l.segmento || '',
      l.origem || '',
      l.cargo || '',
      l.stage || '',
      l.telefone || '',
      l.empresa || '',
      (l.notas || '').replace(/\n/g, ' ') 
    ].map(valor => `"${valor}"`).join(';'); 
  });
  
  const textoCSV = [cabecalhos.join(';'), ...linhas].join('\n');
  
  const blob = new Blob(["\uFEFF" + textoCSV], { type: 'text/csv;charset=utf-8;' }); 
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  link.setAttribute('download', `leads_beatitud_${dataHoje}.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importarDeCSV(arquivo: File, leadsAtuais: Lead[], persistLeads: (leads: Lead[]) => void) {
  const leitor = new FileReader();
  
  leitor.onload = (evento: any) => {
    const texto = evento.target.result as string;
    const linhas = texto.split('\n').filter(linha => linha.trim() !== '');
    
    if (linhas.length <= 1) {
      alert("O arquivo parece estar vazio ou sem dados válidos.");
      return;
    }

    const novosLeads: Lead[] = [];
    
    for (let i = 1; i < linhas.length; i++) {
      const colunas = linhas[i].split(';').map(col => col.replace(/(^"|"$)/g, '').trim());
      
      if (colunas[0]) { 
        novosLeads.push({
          ...EMPTY_LEAD,
          id: genId(), 
          nome: colunas[0] || '',
          instagram: colunas[1] || '',
          segmento: colunas[2] || SEGMENTS[0],
          origem: colunas[3] || ORIGENS[0],
          cargo: colunas[4] || CARGOS[0],
          stage: colunas[5] || 'aquecimento', 
          telefone: colunas[6] || '',
          empresa: colunas[7] || '',
          notas: colunas[8] || '',
        });
      }
    }

    persistLeads([...novosLeads, ...leadsAtuais]);
    alert(`${novosLeads.length} leads importados com sucesso!`);
  };
  
  leitor.readAsText(arquivo, 'UTF-8');
}

// --- COMPONENTS ---
function Badge({ stage }: { stage: string }) {
  const s = stageOf(stage);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.04em',
        padding: '3px 8px',
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}33`,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

function SegBadge({ seg }: { seg: string }) {
  const colors: Record<string, { c: string, bg: string }> = {
    Imobiliário: { c: '#C9A84C', bg: 'rgba(201,168,76,0.1)' },
    'Institucional / Manifesto': { c: '#8B9FD4', bg: 'rgba(139,159,212,0.1)' },
    'Eventos Corporativos': { c: '#5BA882', bg: 'rgba(91,168,130,0.1)' },
  };
  const col = colors[seg] || { c: '#888', bg: 'rgba(136,136,136,0.1)' };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.05em',
        padding: '2px 7px',
        borderRadius: 3,
        background: col.bg,
        color: col.c,
        border: `1px solid ${col.c}33`,
        textTransform: 'uppercase',
      }}
    >
      {seg}
    </span>
  );
}

function FollowUpFlag({ date }: { date: string }) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(date + 'T00:00:00').getTime() - today.getTime()) / 86400000);
  
  if (diff < 0)
    return (
      <span style={{ fontSize: 10, color: '#c07070', fontWeight: 500 }}>
        Atrasado {Math.abs(diff)}d
      </span>
    );
  if (diff === 0)
    return (
      <span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 500 }}>
        Hoje
      </span>
    );
  return (
    <span style={{ fontSize: 10, color: diff <= 3 ? '#C9A84C' : '#555' }}>
      Em {diff}d
    </span>
  );
}

function InstaLink({ handle }: { handle: string }) {
  if (!handle) return null;

  const cleanHandle = handle.replace('@', '').trim();
  const url = `https://instagram.com/${cleanHandle}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()} 
      style={{
        color: '#C9A84C',
        textDecoration: 'none',
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      @{cleanHandle}
    </a>
  );
}

function Modal({ lead, scripts, onSave, onClose, onDelete, onOpenBudget }: { lead: Lead, scripts: Script[], onSave: (l: Lead) => void, onClose: () => void, onDelete: (id: string) => void, onOpenBudget: (l: Lead) => void }) {
  const [form, setForm] = useState<Lead>({ ...EMPTY_LEAD, ...lead });
  const [tab, setTab] = useState('info');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !form.id;

  const [loadingIA, setLoadingIA] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loadingCustomIA, setLoadingCustomIA] = useState(false);

  const handleAnalisarIA = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!form.fotoUrl) return;
    
    setLoadingIA(true);

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        alert("Chave da API não encontrada! Verifique o nome da variável no seu arquivo .env");
        setLoadingIA(false);
        return;
      }

      const promptText = `Análise cirúrgica do perfil visual deste link: ${form.fotoUrl}...`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      set('analiseIA', data.candidates[0].content.parts[0].text);
    } catch (error: any) {
      console.error("Erro ao comunicar com a IA:", error);
      set('analiseIA', "Erro ao conectar com a IA: " + error.message);
    } finally {
      setLoadingIA(false);
    }
  };

  const handleCustomPrompt = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    setLoadingCustomIA(true);
    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("Chave da API não encontrada!");
        setLoadingCustomIA(false);
        return;
      }
      const context = `Aqui estão os dados do Lead: Nome: ${form.nome}. Responda: "${customPrompt}"`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: context }] }]
          })
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      set('analiseCustomizadaIA', data.candidates[0].content.parts[0].text);
      setCustomPrompt('');
    } catch (error: any) {
      console.error("Erro:", error);
      set('analiseCustomizadaIA', "Erro: " + error.message);
    } finally {
      setLoadingCustomIA(false);
    }
  };

  const parseScript = (text: string) => {
    const nomeSeguro = form.nome || '';
    const primeiroNome = nomeSeguro.trim() ? nomeSeguro.split(' ')[0] : 'Lead';
    const empresa = form.empresa || 'sua empresa';
    return text.replace(/{nome}/g, primeiroNome).replace(/{empresa}/g, empresa);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          width: '100%',
          maxWidth: 520,
          padding: '28px 28px 24px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: '#e8e0d0' }}>
            {isNew ? 'Novo Lead' : 'Editar Lead'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 20,
            marginBottom: 20,
            borderBottom: '1px solid #222',
            paddingBottom: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setTab('info')}
            style={{
              background: 'none', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: tab === 'info' ? '#C9A84C' : '#666',
              borderBottom: tab === 'info' ? '2px solid #C9A84C' : 'none',
              paddingBottom: 4, marginBottom: -12,
            }}
          >
            Informações
          </button>
          <button
            onClick={() => setTab('scripts')}
            style={{
              background: 'none', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: tab === 'scripts' ? '#C9A84C' : '#666',
              borderBottom: tab === 'scripts' ? '2px solid #C9A84C' : 'none',
              paddingBottom: 4, marginBottom: -12,
            }}
          >
            Scripts
          </button>
          <button
            onClick={() => setTab('ia')}
            style={{
              background: 'none', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: tab === 'ia' ? '#C9A84C' : '#666',
              borderBottom: tab === 'ia' ? '2px solid #C9A84C' : 'none',
              paddingBottom: 4, marginBottom: -12,
            }}
          >
            Inteligência Artificial
          </button>
        </div>

        <div style={{ overflowY: 'auto', paddingRight: 4, marginBottom: 20 }}>
        {tab === 'info' && (
            <>
              {[
                ['nome', 'Nome', 'text', 'Ex: João Ferreira'],
                ['instagram', '@Instagram', 'text', 'Ex: @joaoferreira'],
                ['empresa', 'Empresa / Marca', 'text', 'Ex: Produtora X'],
                [
                  'telefone',
                  'Telefone / WhatsApp',
                  'text',
                  'Ex: (11) 90000-0000',
                ],
              ].map(([k, label, type, ph]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <label style={theme.label}>{label}</label>
                  <input
                    type={type}
                    value={(form as any)[k]}
                    onChange={(e) => set(k, e.target.value)}
                    placeholder={ph}
                    style={theme.input}
                  />
                </div>
              ))}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={theme.label}>Segmento</label>
                  <select value={form.segmento} onChange={(e) => set('segmento', e.target.value)} style={theme.input}>
                    {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={theme.label}>Origem</label>
                  <select value={form.origem || ORIGENS[0]} onChange={(e) => set('origem', e.target.value)} style={theme.input}>
                    {ORIGENS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={theme.label}>Cargo</label>
                  <select value={form.cargo || CARGOS[0]} onChange={(e) => set('cargo', e.target.value)} style={theme.input}>
                    {CARGOS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={theme.label}>Etapa</label>
                  <select value={form.stage} onChange={(e) => set('stage', e.target.value)} style={theme.input}>
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === 'scripts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {scripts.filter((s) => s.stages.includes(form.stage)).length === 0 ? (
                <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                  Nenhum script vinculado a esta etapa.
                </div>
              ) : (
                scripts.filter((s) => s.stages.includes(form.stage)).map((s) => (
                    <div key={s.id} style={{ background: '#161616', padding: 16, borderRadius: 8, border: '1px solid #222' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C', marginBottom: 10 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: '#0d0d0d', padding: 12, borderRadius: 6, border: '1px solid #1a1a1a' }}>
                        {parseScript(s.text)}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(parseScript(s.text))}
                        style={{ ...theme.btnOutline, marginTop: 12, padding: '6px 12px', fontSize: 11, width: '100%', background: 'rgba(255,255,255,0.03)' }}
                      >
                        Copiar Script
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}
          {tab === 'ia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#161616', padding: 16, borderRadius: 8, border: '1px solid #222' }}>
                <h3 style={{ fontSize: 14, color: '#e8e0d0', margin: '0 0 12px 0' }}>Análise de Posicionamento</h3>
                <label style={theme.label}>URL da Foto do Insta</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <input type="text" value={form.fotoUrl || ''} onChange={(e) => set('fotoUrl', e.target.value)} placeholder="Cole o link da imagem aqui..." style={{ ...theme.input, flex: 1 }} />
                  <button
                    onClick={handleAnalisarIA} disabled={!form.fotoUrl || loadingIA}
                    style={{ ...theme.btnPrimary, whiteSpace: 'nowrap', opacity: (!form.fotoUrl || loadingIA) ? 0.5 : 1, cursor: (!form.fotoUrl || loadingIA) ? 'not-allowed' : 'pointer' }}
                  >
                    {loadingIA ? 'Analisando...' : 'Analisar Foto'}
                  </button>
                </div>
                {form.analiseIA && (
                  <div>
                    <label style={theme.label}>Diagnóstico:</label>
                    <textarea value={form.analiseIA} onChange={(e) => set('analiseIA', e.target.value)} rows={6} style={{ ...theme.input, resize: 'vertical', color: '#8B9FD4', background: 'rgba(139,159,212,0.05)' }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0, paddingTop: 10, borderTop: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {!isNew && (
              <button onClick={() => onDelete(form.id as string)} style={{ ...theme.btnOutline, borderColor: '#4a2020', color: '#c07070', background: 'rgba(139,85,85,0.15)' }}>Remover</button>
            )}
            <button 
              onClick={() => onOpenBudget(form)} 
              style={{ ...theme.btnOutline, borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C', background: 'rgba(201,168,76,0.05)' }}
            >
              💰 Gerar Orçamento
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={theme.btnOutline}>Cancelar</button>
            <button onClick={() => onSave(form)} style={theme.btnPrimary}>{isNew ? 'Adicionar' : 'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VIEWS ---
function KanbanView({ leads, onEdit, onMove }: { leads: Lead[], onEdit: (l: Lead) => void, onMove: (id: string, stage: string) => void }) {
  return (
    <div style={{ display: 'flex', flex: 1, padding: '16px 24px', overflowX: 'auto', overflowY: 'hidden', alignItems: 'flex-start', gap: 16 }}>
      {STAGES.map((stage) => {
        const sLeads = leads.filter((l) => l.stage === stage.id);
        return (
          <div
            key={stage.id} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const leadId = e.dataTransfer.getData('leadId'); if (leadId) onMove(leadId, stage.id); }}
            style={{ display: 'flex', flexDirection: 'column', minWidth: 260, flex: '0 0 260px', height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: stage.color, fontWeight: 600, textTransform: 'uppercase' }}>{stage.label}</span>
              <span style={{ fontSize: 11, color: '#666' }}>{sLeads.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', paddingBottom: 10 }}>
              {sLeads.map((l) => (
                <div
                  key={l.id} draggable onDragStart={(e) => e.dataTransfer.setData('leadId', l.id as string)} onClick={() => onEdit(l)}
                  style={{ background: '#0d0d0d', border: `1px solid #1e1e1e`, borderLeft: `3px solid ${stage.color}88`, borderRadius: 6, padding: 12, cursor: 'grab' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e8e0d0', marginBottom: 4 }}>{l.nome}</div>
                  {l.empresa && <div style={{ fontSize: 12, color: '#888' }}>{l.empresa}</div>}
                  {l.instagram && <div style={{ marginTop: 2, marginBottom: 8 }}><InstaLink handle={l.instagram} /></div>}
                  {!l.instagram && <div style={{ marginBottom: 8 }}></div>}
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 8, fontStyle: 'italic' }}>Origem: {l.origem || 'Não definida'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <SegBadge seg={l.segmento} />
                    <FollowUpFlag date={l.followup} />
                  </div>
                </div>
              ))}
              {sLeads.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#444', fontSize: 12, border: '1px dashed #222', borderRadius: 6 }}>Solte um card aqui</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ leads, onEdit, onMove }: { leads: Lead[], onEdit: (l: Lead) => void, onMove: (id: string, stage: string) => void }) {
  if (!leads.length) return <div style={{ padding: 60, textAlign: 'center', color: '#444' }}>Nenhum lead encontrado.</div>;
  return (
    <div style={{ padding: '0 24px 32px', overflowY: 'auto', flex: 1 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1a1a1a', textAlign: 'left', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>
            <th style={{ padding: '12px' }}>Contato</th><th>Segmento</th><th>Etapa</th><th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} onClick={() => onEdit(l)} style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}>
              <td style={{ padding: '12px' }}>
                <div style={{ color: '#e8e0d0', fontWeight: 500, marginBottom: 2 }}>{l.nome}</div>
                <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {l.empresa && <span>{l.empresa}</span>}
                  {l.empresa && l.instagram && <span>•</span>}
                  <InstaLink handle={l.instagram} />
                </div>
              </td>
              <td><SegBadge seg={l.segmento} /></td>
              <td>
                <select value={l.stage} onClick={(e) => e.stopPropagation()} onChange={(e) => onMove(l.id as string, e.target.value)} style={{ ...theme.input, padding: '4px 8px', width: 'auto' }}>
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </td>
              <td><FollowUpFlag date={l.followup} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- GERADOR DE ORÇAMENTOS VIEW ---
const INITIAL_SERVICES: OrcamentoService[] = [
  { id: 'tour', name: 'Tour de Autoridade', price: 300, desc: 'Corretor apresentando o imóvel com clareza e posicionamento. Um vídeo que reforça autoridade.' },
  { id: 'reels', name: '2 Reels de Cômodos', price: 200, desc: 'Reels verticais dos principais ambientes. Voltados para tráfego e possíveis trends.' },
  { id: 'stories', name: 'Pacote de Stories', price: 70, desc: 'Stories verticais de 10 a 20 segundos. Bastidores, detalhes e chamadas.' },
  { id: 'fotos', name: 'Fotos Editoriais', price: 120, desc: '20 a 35 fotos editadas. Para anúncio, Instagram, portais e materiais comerciais.' },
  { id: 'carrossel', name: 'Carrossel', price: 90, desc: '6 a 10 páginas com copy, destaques, infos técnicas, CTA e design alinhado ao corretor.' },
  { id: 'cinema', name: 'Vídeo Cinematográfico', price: 550, desc: 'Filme imobiliário aspiracional. Mostra o imóvel vivendo, aumenta percepção de valor e posicionamento de alto padrão.' },
  { id: 'express', name: 'Edição Express de Reels', price: 150, desc: 'Você grava no celular, a gente entrega um Reels profissional: cortes, legenda, trilha e cor.' },
  { id: 'marca', name: 'Construção de Marca Pessoal', price: 3500, desc: 'Diagnóstico, posicionamento, narrativa, pilares, bio, linha editorial e direção de conteúdo.' },
  { id: 'consultoria', name: 'Consultoria de Instagram', price: 497, desc: 'Análise de perfil, diagnóstico visual e de conteúdo, ajustes e plano editorial. Para corretor desalinhado ou genérico.' },
];

const INITIAL_PACOTES: OrcamentoPacote[] = [
  { id: 'registro', name: 'Registro', badge: 'Pacote 01', discountPercent: 10, items: ['2 Reels de Cômodos', 'Fotos Editoriais', 'Pacote de Stories', 'Diária inclusa'], services: ['reels', 'fotos', 'stories'], diaria: 1 },
  { id: 'autoridade', name: 'Autoridade', badge: 'Pacote 02', discountPercent: 15, items: ['2 Reels de Cômodos', 'Fotos Editoriais', 'Pacote de Stories', 'Diária inclusa', 'Carrossel', 'Tour de Autoridade'], services: ['reels', 'fotos', 'stories', 'carrossel', 'tour'], diaria: 1 },
  { id: 'cinema', name: 'Cinema', badge: 'Pacote 03', discountPercent: 20, items: ['2 Reels de Cômodos', 'Fotos Editoriais', 'Pacote de Stories', 'Diária inclusa', 'Carrossel', 'Tour de Autoridade', 'Vídeo Cinematográfico'], services: ['reels', 'fotos', 'stories', 'carrossel', 'tour', 'cinema'], diaria: 1 },
];

function GeradorOrcamento({ leadContext }: { leadContext: Lead | null }) {
  const [baseDiaria, setBaseDiaria] = useState(200);
  const [services, setServices] = useState<OrcamentoService[]>(INITIAL_SERVICES);
  const [pacotes, setPacotes] = useState<OrcamentoPacote[]>(INITIAL_PACOTES);
  
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [diarias, setDiarias] = useState(0);
  const [selectedPacote, setSelectedPacote] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientImob, setClientImob] = useState('');
  const [clientImovel, setClientImovel] = useState('');
  const [obs, setObs] = useState('');
  const [manualDiscount, setManualDiscount] = useState<number | ''>('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempDiaria, setTempDiaria] = useState(0);
  const [tempServices, setTempServices] = useState<Record<string, number>>({});
  const [tempPacotes, setTempPacotes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (leadContext) {
      setClientName(leadContext.nome || '');
      setClientImob(leadContext.empresa || '');
    }
  }, [leadContext]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PRICES);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.diaria) setBaseDiaria(data.diaria);
        if (data.services) {
          setServices(prev => prev.map(s => {
            const found = data.services.find((x: any) => x.id === s.id);
            return found ? { ...s, price: found.price } : s;
          }));
        }
        if (data.pacotes) {
          setPacotes(prev => prev.map(p => {
            const found = data.pacotes.find((x: any) => x.id === p.id);
            return found ? { ...p, discountPercent: found.discountPercent } : p;
          }));
        }
      } catch (e) {
        console.error('Error loading prices:', e);
      }
    }
  }, []);

  const openSettings = () => {
    setTempDiaria(baseDiaria);
    const ts: Record<string, number> = {};
    services.forEach(s => ts[s.id] = s.price);
    setTempServices(ts);
    
    const tp: Record<string, number> = {};
    pacotes.forEach(p => tp[p.id] = p.discountPercent);
    setTempPacotes(tp);

    setSettingsOpen(true);
  };

  const saveSettings = () => {
    setBaseDiaria(tempDiaria);
    
    const newServices = services.map(s => ({ ...s, price: tempServices[s.id] ?? s.price }));
    setServices(newServices);
    
    const newPacotes = pacotes.map(p => ({ ...p, discountPercent: tempPacotes[p.id] ?? p.discountPercent }));
    setPacotes(newPacotes);

    localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify({
      diaria: tempDiaria,
      services: newServices.map(s => ({ id: s.id, price: s.price })),
      pacotes: newPacotes.map(p => ({ id: p.id, discountPercent: p.discountPercent }))
    }));

    setSettingsOpen(false);
  };

  const toggleService = (id: string) => {
    if (selectedPacote) {
      setSelectedPacote(null);
    }
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectPacote = (id: string) => {
    if (selectedPacote === id) {
      setSelectedPacote(null);
      setSelectedServices(new Set());
      setDiarias(0);
    } else {
      setSelectedPacote(id);
      const p = pacotes.find(x => x.id === id);
      if (p) {
        setSelectedServices(new Set(p.services));
        setDiarias(p.diaria);
      }
    }
  };

  const changeDiaria = (delta: number) => {
    setDiarias(prev => Math.max(0, prev + delta));
    if (selectedPacote) setSelectedPacote(null);
  };

  const resetAll = () => {
    setSelectedServices(new Set());
    setDiarias(0);
    setSelectedPacote(null);
    setClientName('');
    setClientImob('');
    setClientImovel('');
    setObs('');
    setManualDiscount('');
  };

  // Calculations
  let subtotal = diarias * baseDiaria;
  let packageDiscount = 0;
  const lineItems: { name: string, qty?: number | null, val: number }[] = [];

  if (diarias > 0) {
    lineItems.push({ name: 'Diária de Produção', qty: diarias, val: diarias * baseDiaria });
  }

  selectedServices.forEach(id => {
    const s = services.find(x => x.id === id);
    if (s) {
      subtotal += s.price;
      lineItems.push({ name: s.name, qty: null, val: s.price });
    }
  });

  if (selectedPacote) {
    const p = pacotes.find(x => x.id === selectedPacote);
    if (p) {
      packageDiscount = subtotal * (p.discountPercent / 100);
    }
  }

  const baseTotalCalculated = subtotal - packageDiscount;
  const discountVal = Number(manualDiscount) || 0;
  const finalTotal = Math.max(0, baseTotalCalculated - discountVal);

  const sendWhatsApp = () => {
    let msg = `*Beatitud — Proposta de Produção*\n`;
    msg += `———————————————\n`;
    if (clientName) msg += `*Cliente:* ${clientName}\n`;
    if (clientImob) msg += `*Imobiliária:* ${clientImob}\n`;
    if (clientImovel) msg += `*Imóvel:* ${clientImovel}\n`;
    msg += `\n`;
    
    if (selectedPacote) {
      const p = pacotes.find(x => x.id === selectedPacote);
      if (p) msg += `*Pacote Selecionado:* ${p.name} (-${p.discountPercent}% OFF)\n`;
    } else {
      msg += `*Itens Selecionados:*\n`;
    }

    if (diarias > 0) {
      msg += `• Diária de Produção ×${diarias} → R$ ${(diarias * baseDiaria).toLocaleString('pt-BR')}\n`;
    }
    
    let sumWithoutDiscount = diarias * baseDiaria;
    selectedServices.forEach(id => {
      const s = services.find(x => x.id === id);
      if (s) {
        msg += `• ${s.name} → R$ ${s.price.toLocaleString('pt-BR')}\n`;
        sumWithoutDiscount += s.price;
      }
    });

    msg += `\n`;
    
    if (packageDiscount > 0) {
      msg += `Valor original: ~R$ ${sumWithoutDiscount.toLocaleString('pt-BR')}~\n`;
      msg += `Desconto do pacote: − R$ ${packageDiscount.toLocaleString('pt-BR')}\n`;
    }

    if (discountVal > 0) {
      msg += `Subtotal: R$ ${baseTotalCalculated.toLocaleString('pt-BR')}\n`;
      msg += `Desconto adicional: − R$ ${discountVal.toLocaleString('pt-BR')}\n`;
      msg += `*Total: R$ ${finalTotal.toLocaleString('pt-BR')}*\n`;
    } else {
      msg += `*Total Final: R$ ${baseTotalCalculated.toLocaleString('pt-BR')}*\n`;
    }

    if (obs) msg += `\n_${obs}_\n`;
    msg += `\n_Beatitud · Produção Criativa_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="orcamento-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .orcamento-container {
          --bg: #0D0D0D;
          --surface: #161616;
          --surface2: #1E1E1E;
          --border: #2A2A2A;
          --gold: #C9A96E;
          --gold-light: #E0C99A;
          --white: #F5F2EC;
          --muted: #7A7A7A;
          --danger: #C96E6E;
          background: var(--bg);
          color: var(--white);
          font-family: 'Inter', sans-serif;
          font-weight: 300;
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          overflow: hidden;
        }

        .orcamento-container * { box-sizing: border-box; }

        .orcamento-container header {
          border-bottom: 1px solid var(--border);
          padding: 20px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .orc-logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; letter-spacing: 0.04em; color: var(--gold); line-height: 1.2; }
        .orc-logo span { color: var(--white); font-weight: 400; font-size: 11px; display: block; letter-spacing: 0.18em; text-transform: uppercase; }

        .orc-header-actions { display: flex; gap: 16px; align-items: center; }
        .orc-header-tag { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--border); padding: 6px 14px; border-radius: 2px; }
        .orc-btn-icon { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 6px 12px; border-radius: 2px; cursor: pointer; font-size: 12px; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
        .orc-btn-icon:hover { color: var(--gold); border-color: var(--gold); }

        .orc-main { display: grid; grid-template-columns: 1fr 380px; flex: 1; overflow: hidden; }

        .orc-services-panel { padding: 32px; border-right: 1px solid var(--border); overflow-y: auto; }
        .orc-panel-section { margin-bottom: 48px; }
        .orc-section-label { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold); margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }

        .orc-diaria-block { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 20px 24px; margin-bottom: 24px; }
        .orc-diaria-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .orc-diaria-title { font-size: 14px; font-weight: 500; color: var(--white); }
        .orc-diaria-price { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--gold); }
        .orc-diaria-desc { font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 16px; }
        .orc-diaria-controls { display: flex; align-items: center; gap: 12px; }
        .orc-diaria-label-small { font-size: 11px; color: var(--muted); letter-spacing: 0.1em; }
        
        .orc-counter { display: flex; align-items: center; gap: 0; border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
        .orc-counter button { background: var(--surface2); border: none; color: var(--white); width: 32px; height: 32px; font-size: 16px; cursor: pointer; transition: background 0.15s; }
        .orc-counter button:hover { background: var(--border); }
        .orc-counter-val { width: 40px; text-align: center; font-size: 14px; font-weight: 500; background: var(--surface); color: var(--white); border: none; border-left: 1px solid var(--border); border-right: 1px solid var(--border); height: 32px; line-height: 32px; }
        .orc-diaria-subtotal { margin-left: auto; font-size: 13px; color: var(--gold-light); font-weight: 500; }

        .orc-service-item { display: flex; align-items: flex-start; gap: 16px; padding: 18px 0; border-bottom: 1px solid var(--border); cursor: pointer; transition: opacity 0.15s; }
        .orc-service-item:last-child { border-bottom: none; }
        .orc-service-item:hover { opacity: 0.85; }
        .orc-service-check { width: 20px; height: 20px; border: 1.5px solid var(--border); border-radius: 2px; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; background: transparent; }
        .orc-service-item.selected .orc-service-check { background: var(--gold); border-color: var(--gold); }
        .orc-check-icon { display: none; width: 10px; height: 8px; }
        .orc-service-item.selected .orc-check-icon { display: block; }
        .orc-service-info { flex: 1; }
        .orc-service-name { font-size: 14px; font-weight: 500; color: var(--white); margin-bottom: 4px; }
        .orc-service-desc { font-size: 12px; color: var(--muted); line-height: 1.6; }
        .orc-service-price { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--gold); flex-shrink: 0; text-align: right; }
        .orc-service-price small { display: block; font-family: 'Inter', sans-serif; font-size: 10px; color: var(--muted); margin-top: 2px; letter-spacing: 0.05em; }

        .orc-pacotes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .orc-pacote-card { border: 1.5px solid var(--border); border-radius: 4px; padding: 20px 18px; cursor: pointer; transition: all 0.2s; position: relative; }
        .orc-pacote-card:hover { border-color: var(--muted); }
        .orc-pacote-card.selected { border-color: var(--gold); background: rgba(201, 169, 110, 0.06); }
        .orc-pacote-badge { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; font-weight: 500; }
        .orc-pacote-name { font-family: 'Playfair Display', serif; font-size: 16px; color: var(--white); margin-bottom: 14px; }
        .orc-pacote-items { list-style: none; margin-bottom: 16px; padding-left: 0; }
        .orc-pacote-items li { font-size: 11px; color: var(--muted); padding: 4px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 6px; }
        .orc-pacote-items li:last-child { border-bottom: none; }
        .orc-pacote-items li::before { content: '—'; color: var(--gold); font-size: 9px; flex-shrink: 0; }
        .orc-pacote-price { font-family: 'Playfair Display', serif; font-size: 22px; color: var(--gold); display: flex; flex-direction: column; }
        .orc-pacote-price del { font-size: 12px; color: var(--muted); font-family: 'Inter', sans-serif; margin-bottom: 2px; }
        .orc-pacote-price small { font-family: 'Inter', sans-serif; font-size: 11px; color: var(--muted); font-weight: 300; }
        .orc-pacote-selected-dot { position: absolute; top: 14px; right: 14px; width: 8px; height: 8px; border-radius: 50%; background: var(--gold); display: none; }
        .orc-pacote-card.selected .orc-pacote-selected-dot { display: block; }

        .orc-quote-panel { display: flex; flex-direction: column; padding: 32px; background: var(--surface); overflow-y: auto; height: 100%; }
        .orc-quote-header { margin-bottom: 28px; }
        .orc-quote-title { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--white); margin-bottom: 4px; }
        .orc-quote-subtitle { font-size: 11px; color: var(--muted); letter-spacing: 0.08em; }
        .orc-client-section { margin-bottom: 28px; }
        .orc-client-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
        .orc-client-inputs { display: flex; flex-direction: column; gap: 8px; }
        .orc-client-input { background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; padding: 10px 14px; font-family: 'Inter', sans-serif; font-size: 13px; color: var(--white); outline: none; transition: border-color 0.15s; width: 100%; }
        .orc-client-input::placeholder { color: var(--muted); }
        .orc-client-input:focus { border-color: var(--gold); }
        .orc-line-items { flex: 1; margin-bottom: 20px; }
        .orc-line-items-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
        .orc-empty-state { padding: 32px 0; text-align: center; color: var(--muted); font-size: 12px; line-height: 1.7; border: 1px dashed var(--border); border-radius: 4px; }
        .orc-empty-state strong { display: block; font-family: 'Playfair Display', serif; font-size: 15px; color: #e8e0d0; margin-bottom: 6px; }
        .orc-line-item { display: flex; justify-content: space-between; align-items: baseline; padding: 9px 0; border-bottom: 1px solid var(--border); }
        .orc-line-item:last-child { border-bottom: none; }
        .orc-line-item-name { font-size: 12px; color: var(--white); flex: 1; padding-right: 12px; }
        .orc-line-item-qty { font-size: 11px; color: var(--muted); margin-right: 8px; }
        .orc-line-item-val { font-size: 13px; color: var(--gold-light); font-weight: 500; white-space: nowrap; }

        .orc-total-block { border-top: 1px solid var(--border); padding-top: 16px; margin-bottom: 20px; }
        .orc-total-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
        .orc-total-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); }
        .orc-total-value { font-family: 'Playfair Display', serif; font-size: 28px; color: var(--gold); }
        .orc-discount-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .orc-discount-label { font-size: 11px; color: var(--muted); }
        .orc-discount-input { background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; padding: 5px 10px; font-family: 'Inter', sans-serif; font-size: 12px; color: var(--white); outline: none; width: 70px; text-align: center; }
        .orc-discount-input:focus { border-color: var(--gold); }
        .orc-discount-value { font-size: 12px; color: var(--danger); margin-left: auto; }
        .orc-final-total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
        .orc-final-label { font-family: 'Playfair Display', serif; font-size: 14px; color: var(--white); }
        .orc-final-value { font-family: 'Playfair Display', serif; font-size: 32px; color: var(--white); }

        .orc-actions { display: flex; flex-direction: column; gap: 8px; }
        .orc-btn-primary { background: var(--gold); color: #0D0D0D; border: none; border-radius: 3px; padding: 14px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: background 0.15s; text-align: center; }
        .orc-btn-primary:hover { background: var(--gold-light); }
        .orc-btn-secondary { background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: 3px; padding: 12px; font-family: 'Inter', sans-serif; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; text-align: center; }
        .orc-btn-secondary:hover { border-color: var(--muted); color: var(--white); }
        .orc-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

        .orc-notes-section { margin-bottom: 20px; }
        .orc-notes-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }

        .orc-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; align-items: center; justify-content: center; }
        .orc-modal-overlay.active { display: flex; }
        .orc-modal-content { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; width: 500px; max-width: 90%; max-height: 90vh; overflow-y: auto; padding: 32px; color: var(--white); font-family: 'Inter', sans-serif; }
        .orc-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .orc-modal-title { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--gold); margin: 0; }
        .orc-close-modal { background: none; border: none; color: var(--muted); font-size: 24px; cursor: pointer; }
        .orc-close-modal:hover { color: var(--white); }
        .orc-settings-group { margin-bottom: 24px; }
        .orc-settings-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
        .orc-settings-item label { font-size: 13px; color: var(--white); flex: 1; }
        .orc-settings-item input { width: 100px; background: var(--surface2); border: 1px solid var(--border); color: var(--gold); padding: 8px; border-radius: 3px; text-align: right; outline: none; }

        @media print {
          #app-sidebar, header { display: none !important; }
          .orcamento-container { width: 100vw; height: 100vh; display: block; background: white; color: black; }
          .orc-services-panel, .orc-header-actions { display: none; }
          .orc-main { grid-template-columns: 1fr; display: block; }
          .orc-quote-panel { position: static; height: auto; background: white; color: black; padding: 0; }
          .orc-btn-primary, .orc-btn-secondary, .orc-actions { display: none; }
          .orc-client-input { border-color: #ccc; background: white; color: black; }
          .orc-logo { color: #a07840; }
          .orc-total-value, .orc-final-value, .orc-line-item-val { color: #a07840; }
        }
      `}} />

      <header>
        <div className="orc-logo">Beatitud<span>Produção Criativa</span></div>
        <div className="orc-header-actions">
          <div className="orc-header-tag">Gerador de Orçamento</div>
          <button className="orc-btn-icon" onClick={openSettings}>⚙️ Preços</button>
        </div>
      </header>

      {/* MODAL CONFIGURAÇÕES */}
      <div className={`orc-modal-overlay ${settingsOpen ? 'active' : ''}`}>
        <div className="orc-modal-content">
          <div className="orc-modal-header">
            <h2 className="orc-modal-title">Configurar Preços</h2>
            <button className="orc-close-modal" onClick={() => setSettingsOpen(false)}>×</button>
          </div>
          
          <div className="orc-settings-group">
            <div className="orc-section-label">Valores Base</div>
            <div className="orc-settings-item">
              <label>Diária de Produção</label>
              <input type="number" value={tempDiaria} onChange={e => setTempDiaria(Number(e.target.value))} />
            </div>
            {services.map(s => (
              <div key={s.id} className="orc-settings-item">
                <label>{s.name}</label>
                <input type="number" value={tempServices[s.id] ?? s.price} onChange={e => setTempServices({...tempServices, [s.id]: Number(e.target.value)})} />
              </div>
            ))}
          </div>

          <div className="orc-settings-group">
            <div className="orc-section-label">Descontos dos Pacotes (%)</div>
            {pacotes.map(p => (
              <div key={p.id} className="orc-settings-item">
                <label>{p.name}</label>
                <input type="number" value={tempPacotes[p.id] ?? p.discountPercent} onChange={e => setTempPacotes({...tempPacotes, [p.id]: Number(e.target.value)})} />
              </div>
            ))}
          </div>

          <button className="orc-btn-primary" style={{ width: '100%' }} onClick={saveSettings}>Salvar e Fechar</button>
        </div>
      </div>

      <div className="orc-main">
        <div className="orc-services-panel">
          <div className="orc-panel-section">
            <div className="orc-section-label">Diária de Produção</div>
            <div className="orc-diaria-block">
              <div className="orc-diaria-header">
                <div className="orc-diaria-title">Diária — Gravação presencial</div>
                <div className="orc-diaria-price">R$ {baseDiaria}</div>
              </div>
              <div className="orc-diaria-desc">Inclua uma diária por imóvel visitado. Para gravações de mais de uma casa no mesmo dia, adicione uma diária por propriedade.</div>
              <div className="orc-diaria-controls">
                <span className="orc-diaria-label-small">Nº de diárias:</span>
                <div className="orc-counter">
                  <button onClick={() => changeDiaria(-1)}>−</button>
                  <div className="orc-counter-val">{diarias}</div>
                  <button onClick={() => changeDiaria(1)}>+</button>
                </div>
                <div className="orc-diaria-subtotal">
                  {diarias > 0 ? `R$ ${(diarias * baseDiaria).toLocaleString('pt-BR')}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="orc-panel-section">
            <div className="orc-section-label">Serviços Avulsos</div>
            <div>
              {services.map(s => (
                <div key={s.id} className={`orc-service-item ${selectedServices.has(s.id) ? 'selected' : ''}`} onClick={() => toggleService(s.id)}>
                  <div className="orc-service-check">
                    <svg className="orc-check-icon" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#0D0D0D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="orc-service-info">
                    <div className="orc-service-name">{s.name}</div>
                    <div className="orc-service-desc">{s.desc}</div>
                  </div>
                  <div className="orc-service-price">
                    R$ {s.price.toLocaleString('pt-BR')}
                    <small>por imóvel</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="orc-panel-section">
            <div className="orc-section-label">Pacotes de Produção Presencial</div>
            <div className="orc-pacotes-grid">
              {pacotes.map(p => {
                const originalTotal = p.services.reduce((acc, sid) => {
                  const s = services.find(x => x.id === sid);
                  return acc + (s ? s.price : 0);
                }, 0) + (p.diaria * baseDiaria);
                const discountedTotal = originalTotal - (originalTotal * (p.discountPercent / 100));

                return (
                  <div key={p.id} className={`orc-pacote-card ${selectedPacote === p.id ? 'selected' : ''}`} onClick={() => handleSelectPacote(p.id)}>
                    <div className="orc-pacote-selected-dot"></div>
                    <div className="orc-pacote-badge">{p.badge} (-{p.discountPercent}%)</div>
                    <div className="orc-pacote-name">{p.name}</div>
                    <ul className="orc-pacote-items">
                      {p.items.map((i, idx) => <li key={idx}>{i}</li>)}
                    </ul>
                    <div className="orc-pacote-price">
                      <del>R$ {originalTotal.toLocaleString('pt-BR')}</del>
                      R$ {discountedTotal.toLocaleString('pt-BR')}
                      <small> total</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="orc-quote-panel">
          <div className="orc-quote-header">
            <div className="orc-quote-title">Proposta</div>
            <div className="orc-quote-subtitle">Beatitud · Produção Criativa</div>
          </div>

          <div className="orc-client-section">
            <div className="orc-client-label">Cliente</div>
            <div className="orc-client-inputs">
              <input className="orc-client-input" type="text" placeholder="Nome do corretor" value={clientName} onChange={e => setClientName(e.target.value)} />
              <input className="orc-client-input" type="text" placeholder="Imobiliária (opcional)" value={clientImob} onChange={e => setClientImob(e.target.value)} />
              <input className="orc-client-input" type="text" placeholder="Imóvel / endereço (opcional)" value={clientImovel} onChange={e => setClientImovel(e.target.value)} />
            </div>
          </div>

          <div className="orc-line-items">
            <div className="orc-line-items-label">Itens selecionados</div>
            <div>
              {lineItems.length === 0 ? (
                <div className="orc-empty-state">
                  <strong>Nenhum item</strong>
                  Selecione serviços ou um pacote ao lado para montar o orçamento.
                </div>
              ) : (
                <>
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="orc-line-item">
                      <div className="orc-line-item-name">{item.name}</div>
                      {item.qty && item.qty > 1 && <div className="orc-line-item-qty">×{item.qty}</div>}
                      <div className="orc-line-item-val">R$ {item.val.toLocaleString('pt-BR')}</div>
                    </div>
                  ))}
                  {packageDiscount > 0 && (
                    <div className="orc-line-item" style={{ color: 'var(--gold)', borderTop: '1px dashed var(--border)', marginTop: 8 }}>
                      <div className="orc-line-item-name">Desconto do Pacote Aplicado</div>
                      <div className="orc-line-item-val">− R$ {packageDiscount.toLocaleString('pt-BR')}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="orc-notes-section">
            <div className="orc-notes-label">Observações</div>
            <textarea className="orc-client-input" placeholder="Condições, prazos, combinados…" style={{ resize: 'none', height: 68 }} value={obs} onChange={e => setObs(e.target.value)}></textarea>
          </div>

          <div className="orc-total-block">
            <div className="orc-total-row">
              <div className="orc-total-label">Subtotal</div>
              <div className="orc-total-value">R$ {baseTotalCalculated.toLocaleString('pt-BR')}</div>
            </div>
            <div className="orc-discount-row">
              <span className="orc-discount-label">Desconto Adicional (R$)</span>
              <input className="orc-discount-input" type="number" placeholder="0" min="0" value={manualDiscount} onChange={e => setManualDiscount(e.target.value ? Number(e.target.value) : '')} />
              <span className="orc-discount-value">{discountVal > 0 ? `− R$ ${discountVal.toLocaleString('pt-BR')}` : ''}</span>
            </div>
            <div className="orc-final-total">
              <div className="orc-final-label">Total</div>
              <div className="orc-final-value">R$ {finalTotal.toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div className="orc-actions">
            <button className="orc-btn-primary" disabled={lineItems.length === 0} onClick={sendWhatsApp}>Enviar via WhatsApp</button>
            <button className="orc-btn-secondary" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
            <button className="orc-btn-secondary" onClick={resetAll}>Limpar tudo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP ---
function OverviewView({ leads, onEdit }: { leads: Lead[], onEdit: (l: Lead) => void }) {
  const totalLeads = leads.length;
  const ativos = leads.filter((l) => l.stage !== 'fechado' && l.stage !== 'perdido').length;
  const propostas = leads.filter((l) => l.stage === 'proposta').length;
  const fechados = leads.filter((l) => l.stage === 'fechado').length;
  const taxaConversao = totalLeads === 0 ? 0 : Math.round((fechados / totalLeads) * 100);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leadsAtencao = leads.filter((l) => {
    if (!l.followup || l.stage === 'fechado' || l.stage === 'perdido') return false;
    const fDate = new Date(l.followup + 'T00:00:00');
    return fDate <= today; 
  }).sort((a, b) => new Date(a.followup).getTime() - new Date(b.followup).getTime()); 

  const cardStyle = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: 8, flex: 1, minWidth: 150 };

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h2 style={{ fontSize: 22, color: '#e8e0d0', fontWeight: 500, margin: 0 }}>Visão Geral</h2><p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Acompanhe a saúde comercial da sua produtora.</p></div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={cardStyle}><span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads Ativos</span><span style={{ fontSize: 32, fontWeight: 600, color: '#e8e0d0' }}>{ativos}</span></div>
        <div style={cardStyle}><span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Propostas Enviadas</span><span style={{ fontSize: 32, fontWeight: 600, color: '#8B9FD4' }}>{propostas}</span></div>
        <div style={cardStyle}><span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Negócios Fechados</span><span style={{ fontSize: 32, fontWeight: 600, color: '#5BA882' }}>{fechados}</span></div>
        <div style={cardStyle}><span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taxa de Conversão</span><span style={{ fontSize: 32, fontWeight: 600, color: '#C9A84C' }}>{taxaConversao}%</span></div>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 14, color: '#e8e0d0', marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>🚨 Precisam de Atenção</h3>
          {leadsAtencao.length === 0 ? (
            <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Tudo em dia!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leadsAtencao.map(l => (
                <div key={l.id} onClick={() => onEdit(l)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', padding: '10px 14px', borderRadius: 6, border: '1px solid #1e1e1e', cursor: 'pointer' }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: '#e8e0d0' }}>{l.nome}</div><div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{l.empresa || 'Sem empresa'}</div></div>
                  <FollowUpFlag date={l.followup} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 300px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 14, color: '#e8e0d0', marginTop: 0, marginBottom: 16 }}>📊 Raio-X do Funil</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STAGES.map(stage => {
              const qtd = leads.filter(l => l.stage === stage.id).length;
              const percentual = totalLeads === 0 ? 0 : Math.round((qtd / totalLeads) * 100);
              return (
                <div key={stage.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#aaa' }}><span>{stage.label}</span><span>{qtd} ({percentual}%)</span></div>
                  <div style={{ width: '100%', height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${percentual}%`, height: '100%', background: stage.color, borderRadius: 3, transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptModal({ script, onSave, onClose, onDelete }: { script: Script | null, onSave: (s: Script) => void, onClose: () => void, onDelete: (id: string) => void }) {
  const [form, setForm] = useState<Script>(script || { id: null, title: '', text: '', stages: [] });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !form.id;
  const toggleStage = (stgId: string) => { set('stages', form.stages.includes(stgId) ? form.stages.filter((s) => s !== stgId) : [...form.stages, stgId]); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, width: '100%', maxWidth: 520, padding: '28px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#e8e0d0' }}>{isNew ? 'Novo Script' : 'Editar Script'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ marginBottom: 14 }}><label style={theme.label}>Título do Script</label><input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex: Follow-up 01" style={theme.input} /></div>
        <div style={{ marginBottom: 14 }}>
          <label style={theme.label}>Fases em que este script aparece</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STAGES.map((s) => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: form.stages.includes(s.id) ? '#C9A84C' : '#888', background: form.stages.includes(s.id) ? 'rgba(201,168,76,0.1)' : '#1a1a1a', border: `1px solid ${form.stages.includes(s.id) ? '#C9A84C55' : '#222'}`, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="checkbox" checked={form.stages.includes(s.id)} onChange={() => toggleStage(s.id)} style={{ display: 'none' }} />{s.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}><label style={theme.label}>Texto (Use {'{nome}'} e {'{empresa}'})</label><textarea value={form.text} onChange={(e) => set('text', e.target.value)} rows={6} style={{ ...theme.input, resize: 'vertical', fontFamily: 'monospace' }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {!isNew ? <button onClick={() => onDelete(form.id as string)} style={{ ...theme.btnOutline, borderColor: '#4a2020', color: '#c07070', background: 'rgba(139,85,85,0.15)' }}>Remover</button> : <div />}
          <div style={{ display: 'flex', gap: 10 }}><button onClick={onClose} style={theme.btnOutline}>Cancelar</button><button onClick={() => onSave(form)} style={theme.btnPrimary}>Salvar</button></div>
        </div>
      </div>
    </div>
  );
}

function ScriptsView({ scripts, onAdd, onEdit }: { scripts: Script[], onAdd: () => void, onEdit: (s: Script) => void }) {
  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div><h2 style={{ fontSize: 22, color: '#e8e0d0', fontWeight: 500, margin: 0 }}>Central de Scripts</h2><p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Crie modelos e vincule-os às etapas do funil.</p></div>
        <button onClick={onAdd} style={theme.btnPrimary}>+ Novo Script</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {scripts.map((s) => (
          <div key={s.id} style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#C9A84C' }}>{s.title}</div>
              <button onClick={() => onEdit(s)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Editar</button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>{s.stages.map((stg) => <Badge key={stg} stage={stg} />)}</div>
            <div style={{ fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap', background: '#0a0a0a', padding: 12, borderRadius: 6, border: '1px solid #1a1a1a', flex: 1 }}>{s.text}</div>
          </div>
        ))}
        {scripts.length === 0 && <div style={{ color: '#666', fontSize: 14 }}>Nenhum script criado ainda.</div>}
      </div>
    </div>
  );
}

function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoadingLogin(false);
    if (error) alert('Não foi possível entrar. Verifique e-mail e senha.');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e0d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: 20 }}>
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 380, background: '#111', border: '1px solid #222', borderRadius: 12, padding: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Beatitud</div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Entre para acessar o CRM.</div>
        <div style={{ marginBottom: 14 }}>
          <label style={theme.label}>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" style={theme.input} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={theme.label}>Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Sua senha" style={theme.input} />
        </div>
        <button disabled={loadingLogin} style={{ ...theme.btnPrimary, width: '100%', opacity: loadingLogin ? 0.6 : 1 }}>
          {loadingLogin ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [modal, setModal] = useState<Lead | null>(null); 
  const [scriptModal, setScriptModal] = useState<Script | null>(null); 

  const [filterStage, setFilterStage] = useState('all');
  const [filterOrigem, setFilterOrigem] = useState('all');
  const [filterCargo, setFilterCargo] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('kanban');
  
  // Controle do menu principal
  const [currentMenu, setCurrentMenu] = useState('crm');
  // Contexto para enviar dados de um lead ao gerador de orçamentos
  const [budgetLeadContext, setBudgetLeadContext] = useState<Lead | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setScripts(loadScripts());

    if (!session) {
      setLeads([]);
      setLoading(false);
      return;
    }

    async function carregarDadosDaNuvem() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('leads').select('*').order('id', { ascending: false });
        if (error) throw error;
        if (data) setLeads(data);
      } catch (error: any) {
        console.error(error);
        alert("Falha ao tentar carregar os leads da nuvem.");
      } finally {
        setLoading(false);
      }
    }

    carregarDadosDaNuvem();
  }, [session]);

  const persistLeads = useCallback((next: Lead[]) => { setLeads(next); saveLeads(next); }, []);
  const handleMoveLead = async (id: string, stage: string) => {
    const leadsAntes = leads;
  
    const leadsAtualizados = leads.map((lead) =>
      lead.id === id ? { ...lead, stage } : lead
    );
  
    setLeads(leadsAtualizados);
  
    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage })
        .eq('id', id);
  
      if (error) throw error;
    } catch (error) {
      console.error(error);
      setLeads(leadsAntes);
      alert('Erro ao atualizar a etapa do lead no banco de dados.');
    }
  };
  const persistScripts = useCallback((next: Script[]) => { setScripts(next); saveScripts(next); }, []);

  const handleSaveLead = async (form: Lead) => {
    if (!form.nome.trim()) return;
    try {
      if (form.id) {
        const { error } = await supabase.from('leads').update({
            nome: form.nome, instagram: form.instagram, segmento: form.segmento, origem: form.origem,
            cargo: form.cargo, stage: form.stage, telefone: form.telefone, empresa: form.empresa,
            notas: form.notas, fotoUrl: form.fotoUrl, analiseIA: form.analiseIA, analiseCustomizadaIA: form.analiseCustomizadaIA
          }).eq('id', form.id);
        if (error) throw error;
        setLeads(leads.map((l) => (l.id === form.id ? form : l)));
      } else {
        const novoId = genId();
        const novoLead = { ...form, id: novoId };
        const { error } = await supabase.from('leads').insert([novoLead]);
        if (error) throw error;
        setLeads([novoLead, ...leads]);
      }
    } catch (error) {
      alert("Erro ao salvar no banco de dados.");
    }
    setModal(null);
  };

  const handleSaveScript = (form: Script) => {
    if (!form.title.trim() || !form.text.trim()) return;
    persistScripts(form.id ? scripts.map((s) => (s.id === form.id ? form : s)) : [{ ...form, id: genId() }, ...scripts]);
    setScriptModal(null);
  };

  const handleOpenBudget = (leadInfo: Lead) => {
    setBudgetLeadContext(leadInfo);
    setCurrentMenu('orcamentos');
    setModal(null);
  };

  const filtered = leads.filter(
    (l) =>
      (filterStage === 'all' || l.stage === filterStage) &&
      (filterOrigem === 'all' || l.origem === filterOrigem) && 
      (filterCargo === 'all' || l.cargo === filterCargo) &&
      (!search || `${l.nome} ${l.empresa}`.toLowerCase().includes(search.toLowerCase()))
  );

  if (authLoading) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>Carregando acesso...</div>;
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0a0a0a', fontFamily: "'Inter', sans-serif", color: '#e8e0d0', overflow: 'hidden' }}>
      
      {modal && (
        <Modal
          lead={modal} scripts={scripts} onSave={handleSaveLead} onClose={() => setModal(null)}
          onOpenBudget={handleOpenBudget}
          onDelete={async (id) => {
            try {
              const { error } = await supabase.from('leads').delete().eq('id', id);
              if (error) throw error;
              persistLeads(leads.filter((l) => l.id !== id));
              setModal(null);
            } catch (error) {
              alert("Erro ao deletar lead.");
            }
          }}
        />
      )}
      {scriptModal && (
        <ScriptModal
          script={scriptModal} onSave={handleSaveScript} onClose={() => setScriptModal(null)}
          onDelete={(id) => { persistScripts(scripts.filter((s) => s.id !== id)); setScriptModal(null); }}
        />
      )}

      {/* Sidebar */}
      <div id="app-sidebar" style={{ width: 240, background: '#0d0d0d', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', height: 65, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Beatitud</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: 8 }}>
          <button onClick={() => setCurrentMenu('overview')} style={{ background: currentMenu === 'overview' ? 'rgba(201,168,76,0.1)' : 'transparent', color: currentMenu === 'overview' ? '#C9A84C' : '#888', border: 'none', padding: '10px 16px', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>Visão Geral</button>
          <button onClick={() => setCurrentMenu('crm')} style={{ background: currentMenu === 'crm' ? 'rgba(201,168,76,0.1)' : 'transparent', color: currentMenu === 'crm' ? '#C9A84C' : '#888', border: 'none', padding: '10px 16px', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>Prospecção</button>
          <button onClick={() => { setCurrentMenu('orcamentos'); setBudgetLeadContext(null); }} style={{ background: currentMenu === 'orcamentos' ? 'rgba(201,168,76,0.1)' : 'transparent', color: currentMenu === 'orcamentos' ? '#C9A84C' : '#888', border: 'none', padding: '10px 16px', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>Orçamentos</button>
          <button onClick={() => setCurrentMenu('scripts')} style={{ background: currentMenu === 'scripts' ? 'rgba(201,168,76,0.1)' : 'transparent', color: currentMenu === 'scripts' ? '#C9A84C' : '#888', border: 'none', padding: '10px 16px', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>Scripts</button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', color: '#666', border: 'none', padding: '10px 16px', borderRadius: 6, textAlign: 'left', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', marginTop: 16 }}>Sair</button>
        </div>
      </div>

      {/* Área Principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#444' }}>Carregando...</div>
        ) : currentMenu === 'overview' ? (
          <OverviewView leads={leads} onEdit={setModal} />
        ) : currentMenu === 'orcamentos' ? (
          <GeradorOrcamento leadContext={budgetLeadContext} />
        ) : currentMenu === 'crm' ? (
          <>
            <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, height: 65, boxSizing: 'border-box' }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>Gestão de Leads</span>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => exportarParaCSV(leads)} style={{ ...theme.btnOutline, borderColor: '#333' }}>📥 Exportar Excel</button>
                <label style={{ ...theme.btnOutline, borderColor: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  📤 Importar Excel
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files.length > 0) { importarDeCSV(e.target.files[0], leads, persistLeads); e.target.value = ''; } }} />
                </label>
                <button onClick={() => setModal({ ...EMPTY_LEAD })} style={theme.btnPrimary}>+ Novo Lead</button>
              </div>
            </div>

            <div style={{ padding: '12px 24px', display: 'flex', gap: 12, borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
              <input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...theme.input, width: 220, padding: '7px 12px' }} />
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ ...theme.input, width: 'auto', padding: '7px 12px' }}>
                <option value="all">Todas as etapas</option>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select value={filterOrigem} onChange={(e) => setFilterOrigem(e.target.value)} style={{ ...theme.input, width: 'auto', padding: '7px 12px' }}>
                <option value="all">Todas as origens</option>
                {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={filterCargo} onChange={(e) => setFilterCargo(e.target.value)} style={{ ...theme.input, width: 'auto', padding: '7px 12px' }}>
                <option value="all">Todos os Cargos</option>
                {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: 'flex', marginLeft: 'auto', border: '1px solid #1e1e1e', borderRadius: 6, overflow: 'hidden' }}>
                {['kanban', 'list'].map((v) => (
                  <button key={v} onClick={() => setView(v)} style={{ background: view === v ? '#1a1a1a' : 'transparent', border: 'none', color: view === v ? '#C9A84C' : '#666', padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>{v === 'list' ? 'Lista' : 'Kanban'}</button>
                ))}
              </div>
            </div>

            {view === 'kanban' ? (
              <KanbanView leads={filtered} onEdit={setModal} onMove={handleMoveLead} />
            ) : (
              <ListView leads={filtered} onEdit={setModal} onMove={handleMoveLead} />
            )}
          </>
        ) : (
          <ScriptsView scripts={scripts} onAdd={() => setScriptModal({ id: null, title: '', text: '', stages: [] })} onEdit={(script) => setScriptModal(script)} />
        )}
      </div>
    </div>
  );
}