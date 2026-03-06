// ============================================================
// VOZ.JS — Motor de voz global para todas as páginas
// ============================================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let vozAtiva = false;
let navegando = false;

// Detecta em qual página estamos
const pagina = window.location.pathname;
const naInicio     = pagina.endsWith('index.html') && !pagina.includes('/camera') && !pagina.includes('/compromissos') && !pagina.includes('/emails') && !pagina.includes('/comandos');
const naCamera     = pagina.includes('/camera');
const naAgenda     = pagina.includes('/compromissos');
const noEmail      = pagina.includes('/emails');
const nosComandos  = pagina.includes('/comandos');

// ============================================================
// INICIAR VOZ
// ============================================================
function iniciarVoz() {
  if (!SpeechRecognition) {
    vozNotify('⚠ Use o Chrome para ativar a voz.', 'erro');
    return;
  }
  if (vozAtiva) return;

  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    vozAtiva = true;
    atualizarBotaoVoz(true);
  };

  recognition.onresult = (e) => {
    if (navegando) return;
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (final += t) : (interim += t);
    }
    // Mostra o que está ouvindo no indicador flutuante
    const display = final || interim;
    const el = document.getElementById('voz-texto');
    if (el) el.textContent = display;

    if (final.trim()) processarComando(final.toLowerCase().trim());
  };

  recognition.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    if (e.error === 'not-allowed') {
      vozNotify('⚠ Permita o microfone nas configurações do navegador.', 'erro');
      pararVoz();
      return;
    }
  };

  recognition.onend = () => {
    if (vozAtiva && !navegando) {
      setTimeout(() => {
        if (vozAtiva && !navegando) {
          try { recognition.start(); } catch(e) {}
        }
      }, 400);
    }
  };

  try {
    recognition.start();
    vozNotify('🎙 Voz ativada! Pode falar.', 'ok');
  } catch(e) {
    vozNotify('⚠ Não foi possível ativar o microfone.', 'erro');
  }
}

function pararVoz() {
  vozAtiva = false;
  try { if (recognition) recognition.stop(); } catch(e) {}
  atualizarBotaoVoz(false);
}

function toggleVoz() {
  vozAtiva ? pararVoz() : iniciarVoz();
}

// ============================================================
// PROCESSAR COMANDOS
// ============================================================
function processarComando(texto) {
  // NAVEGAÇÃO
  if (texto.includes('abrir câmera') || texto.includes('abrir camera') || texto.includes('abre câmera') || texto.includes('abre camera')) {
    vozNotify('📷 Abrindo câmera...', 'ok');
    falar('Abrindo câmera');
    irPara('../camera/index.html');

  } else if (texto.includes('fechar câmera') || texto.includes('fechar camera') || texto.includes('fecha câmera') || texto.includes('fecha camera')) {
    if (naCamera) { vozNotify('🏠 Voltando...', 'ok'); falar('Voltando ao início'); irPara('../index.html'); }
    else vozNotify('A câmera não está aberta.', 'info');

  } else if (texto.includes('abrir agenda') || texto.includes('abre agenda') || texto.includes('abrir compromissos') || texto.includes('abre compromissos')) {
    vozNotify('📅 Abrindo agenda...', 'ok');
    falar('Abrindo agenda');
    irPara('../compromissos/index.html');

  } else if (texto.includes('fechar agenda') || texto.includes('fecha agenda') || texto.includes('fechar compromissos') || texto.includes('fecha compromissos')) {
    if (naAgenda) { vozNotify('🏠 Voltando...', 'ok'); falar('Voltando ao início'); irPara('../index.html'); }
    else vozNotify('A agenda não está aberta.', 'info');

  } else if (texto.includes('abrir email') || texto.includes('abre email') || texto.includes('abrir e-mail') || texto.includes('abre e-mail')) {
    vozNotify('✉️ Abrindo e-mails...', 'ok');
    falar('Abrindo e-mails');
    irPara('../emails/index.html');

  } else if (texto.includes('fechar email') || texto.includes('fecha email') || texto.includes('fechar e-mail') || texto.includes('fecha e-mail')) {
    if (noEmail) { vozNotify('🏠 Voltando...', 'ok'); falar('Voltando ao início'); irPara('../index.html'); }
    else vozNotify('O e-mail não está aberto.', 'info');

  } else if (texto.includes('início') || texto.includes('inicio') || texto.includes('voltar') || texto.includes('página principal') || texto.includes('pagina principal')) {
    vozNotify('🏠 Indo para o início...', 'ok');
    falar('Voltando ao início');
    irPara('../index.html');

  // AGENDA — CONSULTAS
  } else if (texto.includes('compromisso hoje') || texto.includes('tenho compromisso') || texto.includes('agenda hoje') || texto.includes('o que tenho hoje')) {
    verificarCompromissosHoje();

  } else if (texto.includes('próximo compromisso') || texto.includes('proximo compromisso')) {
    proximoCompromisso();

  // HORÁRIO E DATA
  } else if (texto.includes('hora') || texto.includes('horas')) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    vozNotify(`🕐 São ${h}:${m}`, 'ok');
    falar(`São ${h} horas e ${m} minutos`);

  } else if (texto.includes('dia') || texto.includes('data') || texto.includes('hoje')) {
    const now = new Date();
    const dias = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const str = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
    vozNotify(`📅 ${str}`, 'ok');
    falar(`Hoje é ${str}`);

  // CÂMERA — TIRAR FOTO
  } else if ((texto.includes('tirar foto') || texto.includes('tira foto') || texto.includes('fotografar')) && naCamera) {
    const btn = document.getElementById('btnCapture');
    if (btn && !btn.disabled) { btn.click(); vozNotify('📸 Foto tirada!', 'ok'); falar('Foto tirada'); }
    else { vozNotify('Ligue a câmera primeiro.', 'info'); falar('Ligue a câmera primeiro'); }

  } else if ((texto.includes('ligar câmera') || texto.includes('liga câmera') || texto.includes('ligar camera') || texto.includes('liga camera')) && naCamera) {
    const btn = document.getElementById('btnStart');
    if (btn && !btn.disabled) { btn.click(); falar('Câmera ligada'); }

  } else if ((texto.includes('desligar câmera') || texto.includes('desliga câmera') || texto.includes('desligar camera')) && naCamera) {
    const btn = document.getElementById('btnStop');
    if (btn && !btn.disabled) { btn.click(); falar('Câmera desligada'); }

  }
}

// ============================================================
// FUNÇÕES DE AGENDA
// ============================================================
function verificarCompromissosHoje() {
  const eventos = JSON.parse(localStorage.getItem('events') || '[]');
  const hoje = new Date().toISOString().split('T')[0];
  const deHoje = eventos.filter(e => e.date === hoje && !e.done);

  if (deHoje.length === 0) {
    vozNotify('📅 Nenhum compromisso hoje!', 'ok');
    falar('Você não tem compromissos hoje.');
  } else {
    const nomes = deHoje.map(e => `${e.time} — ${e.title}`).join(', ');
    vozNotify(`📅 Hoje: ${deHoje.length} compromisso(s)`, 'ok');
    falar(`Você tem ${deHoje.length} compromisso${deHoje.length > 1 ? 's' : ''} hoje. ${deHoje.map(e => `${e.title} às ${e.time}`).join(', ')}`);
  }
}

function proximoCompromisso() {
  const eventos = JSON.parse(localStorage.getItem('events') || '[]');
  const agora = new Date();
  const agoraStr = agora.toISOString().split('T')[0] + agora.toTimeString().slice(0,5);
  const futuros = eventos.filter(e => !e.done && (e.date + e.time) >= agoraStr);

  if (futuros.length === 0) {
    vozNotify('📅 Sem próximos compromissos.', 'ok');
    falar('Você não tem próximos compromissos.');
  } else {
    const p = futuros[0];
    vozNotify(`📅 Próximo: ${p.title} às ${p.time}`, 'ok');
    falar(`Seu próximo compromisso é ${p.title} às ${p.time}`);
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function irPara(url) {
  navegando = true;
  setTimeout(() => { window.location.href = url; }, 1000);
}

function falar(texto) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  }
}

function vozNotify(msg, tipo) {
  const el = document.getElementById('voz-notify');
  if (!el) return;
  el.textContent = msg;
  el.className = 'voz-notify voz-' + tipo;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function atualizarBotaoVoz(ativo) {
  const btn = document.getElementById('voz-fab');
  if (!btn) return;
  btn.textContent = ativo ? '🎙️' : '🎤';
  btn.title = ativo ? 'Voz ativa — toque para desativar' : 'Toque para ativar voz';
  btn.classList.toggle('ativo', ativo);
}

// ============================================================
// INJETAR UI FLUTUANTE EM TODAS AS PÁGINAS
// ============================================================
function injetarUI() {
  const style = document.createElement('style');
  style.textContent = `
    .voz-fab {
      position: fixed;
      bottom: 28px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #0a1520;
      border: 2px solid #0d2a3f;
      font-size: 26px;
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      transition: all 0.3s;
    }
    .voz-fab.ativo {
      border-color: #ff4466;
      background: rgba(255,68,102,0.15);
      box-shadow: 0 0 20px rgba(255,68,102,0.4);
      animation: vozPulse 1.8s ease-in-out infinite;
    }
    @keyframes vozPulse {
      0%,100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .voz-notify {
      position: fixed;
      bottom: 100px;
      right: 24px;
      background: #0a1520;
      border-radius: 12px;
      padding: 12px 18px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 15px;
      letter-spacing: 1px;
      z-index: 9998;
      max-width: 280px;
      display: none;
      animation: vozSlide 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .voz-ok    { border: 1px solid #00ff88; color: #00ff88; }
    .voz-erro  { border: 1px solid #ff4466; color: #ff4466; }
    .voz-info  { border: 1px solid #00d4ff; color: #00d4ff; }
    @keyframes vozSlide {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .voz-ouvindo {
      position: fixed;
      bottom: 100px;
      left: 24px;
      background: #0a1520;
      border: 1px solid #ff4466;
      border-radius: 10px;
      padding: 8px 16px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 13px;
      letter-spacing: 1px;
      color: #c8e8f5;
      z-index: 9998;
      max-width: 220px;
      display: none;
    }
    .voz-fab.ativo ~ .voz-ouvindo { display: block; }
  `;
  document.head.appendChild(style);

  // Botão flutuante
  const fab = document.createElement('button');
  fab.id = 'voz-fab';
  fab.className = 'voz-fab';
  fab.textContent = '🎤';
  fab.title = 'Toque para ativar voz';
  fab.onclick = toggleVoz;
  document.body.appendChild(fab);

  // Notificação
  const notify = document.createElement('div');
  notify.id = 'voz-notify';
  notify.className = 'voz-notify';
  document.body.appendChild(notify);

  // Texto ouvindo
  const ouvindo = document.createElement('div');
  ouvindo.id = 'voz-texto';
  ouvindo.className = 'voz-ouvindo';
  ouvindo.textContent = '...';
  document.body.appendChild(ouvindo);
}

// Inicia tudo quando a página carregar
window.addEventListener('DOMContentLoaded', injetarUI);
