// ============================================================
// VOZ.JS — Motor de voz global para todas as páginas
// ============================================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let vozAtiva = false;
let navegando = false;

// Detecta em qual página estamos
const pagina = window.location.pathname;
const naInicio    = !pagina.includes('/camera') && !pagina.includes('/compromissos') && !pagina.includes('/emails') && !pagina.includes('/comandos');
const naCamera    = pagina.includes('/camera');
const naAgenda    = pagina.includes('/compromissos');
const noEmail     = pagina.includes('/emails');
const nosComandos = pagina.includes('/comandos');

// Caminhos corretos dependendo da página
function caminho(destino) {
  if (naInicio) {
    // Na raiz, não precisa de ../
    const rotas = { camera: 'camera/index.html', agenda: 'compromissos/index.html', email: 'emails/index.html', comandos: 'comandos/index.html', inicio: 'index.html' };
    return rotas[destino];
  } else {
    // Nas subpastas, precisa de ../
    const rotas = { camera: '../camera/index.html', agenda: '../compromissos/index.html', email: '../emails/index.html', comandos: '../comandos/index.html', inicio: '../index.html' };
    return rotas[destino];
  }
}

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
  recognition.interimResults = false; // false = mais rápido, responde só quando certeza

  recognition.onstart = () => {
    vozAtiva = true;
    atualizarBotaoVoz(true);
  };

  recognition.onresult = (e) => {
    if (navegando) return;
    // Pega o resultado mais recente
    const texto = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
    const el = document.getElementById('voz-texto');
    if (el) el.textContent = texto;
    processarComando(texto);
  };

  recognition.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    if (e.error === 'not-allowed') {
      vozNotify('⚠ Permita o microfone nas configurações.', 'erro');
      pararVoz();
      return;
    }
  };

  // Reinicia automaticamente ao parar
  recognition.onend = () => {
    if (vozAtiva && !navegando) {
      setTimeout(() => {
        if (vozAtiva && !navegando) {
          try { recognition.start(); } catch(e) {}
        }
      }, 200); // 200ms = reinício mais rápido
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

  // CÂMERA
  if (texto.includes('câmera') || texto.includes('camera')) {
    if (texto.includes('fechar') || texto.includes('fecha') || texto.includes('sair')) {
      if (naCamera) { vozNotify('🏠 Voltando...', 'ok'); falar('Voltando'); irPara(caminho('inicio')); }
      else vozNotify('A câmera não está aberta.', 'info');
    } else if (texto.includes('tirar foto') || texto.includes('tira foto') || texto.includes('foto')) {
      if (naCamera) {
        const btn = document.getElementById('btnCapture');
        if (btn && !btn.disabled) { btn.click(); vozNotify('📸 Foto tirada!', 'ok'); falar('Foto tirada'); }
        else vozNotify('Ligue a câmera primeiro.', 'info');
      } else {
        vozNotify('📷 Abrindo câmera...', 'ok'); falar('Abrindo câmera'); irPara(caminho('camera'));
      }
    } else if (texto.includes('ligar') || texto.includes('liga')) {
      if (naCamera) { document.getElementById('btnStart')?.click(); falar('Câmera ligada'); }
      else { vozNotify('📷 Abrindo câmera...', 'ok'); falar('Abrindo câmera'); irPara(caminho('camera')); }
    } else if (texto.includes('desligar') || texto.includes('desliga')) {
      if (naCamera) { document.getElementById('btnStop')?.click(); falar('Câmera desligada'); }
    } else {
      // Qualquer menção a câmera = abrir
      vozNotify('📷 Abrindo câmera...', 'ok'); falar('Abrindo câmera'); irPara(caminho('camera'));
    }

  // AGENDA / COMPROMISSOS
  } else if (texto.includes('agenda') || texto.includes('compromisso')) {
    if (texto.includes('fechar') || texto.includes('fecha') || texto.includes('sair')) {
      if (naAgenda) { vozNotify('🏠 Voltando...', 'ok'); falar('Voltando'); irPara(caminho('inicio')); }
      else vozNotify('A agenda não está aberta.', 'info');
    } else if (texto.includes('tenho') || texto.includes('hoje') || texto.includes('o que')) {
      verificarCompromissosHoje();
    } else if (texto.includes('próximo') || texto.includes('proximo')) {
      proximoCompromisso();
    } else {
      vozNotify('📅 Abrindo agenda...', 'ok'); falar('Abrindo agenda'); irPara(caminho('agenda'));
    }

  // EMAIL
  } else if (texto.includes('email') || texto.includes('e-mail') || texto.includes('correio')) {
    if (texto.includes('fechar') || texto.includes('fecha') || texto.includes('sair')) {
      if (noEmail) { vozNotify('🏠 Voltando...', 'ok'); falar('Voltando'); irPara(caminho('inicio')); }
      else vozNotify('O e-mail não está aberto.', 'info');
    } else {
      vozNotify('✉️ Abrindo e-mails...', 'ok'); falar('Abrindo e-mails'); irPara(caminho('email'));
    }

  // VOLTAR / INÍCIO
  } else if (texto.includes('voltar') || texto.includes('início') || texto.includes('inicio') || texto.includes('principal') || texto.includes('home')) {
    vozNotify('🏠 Indo para o início...', 'ok'); falar('Voltando ao início'); irPara(caminho('inicio'));

  // HORAS
  } else if (texto.includes('hora')) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    vozNotify(`🕐 São ${h}:${m}`, 'ok');
    falar(`São ${h} horas e ${m} minutos`);

  // DATA
  } else if (texto.includes('dia') || texto.includes('data') || texto.includes('hoje')) {
    const now = new Date();
    const dias = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const str = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
    vozNotify(`📅 ${str}`, 'ok');
    falar(`Hoje é ${str}`);
  }
}

// ============================================================
// AGENDA — CONSULTAS
// ============================================================
function verificarCompromissosHoje() {
  const eventos = JSON.parse(localStorage.getItem('events') || '[]');
  const hoje = new Date().toISOString().split('T')[0];
  const deHoje = eventos.filter(e => e.date === hoje && !e.done);
  if (deHoje.length === 0) {
    vozNotify('📅 Nenhum compromisso hoje!', 'ok');
    falar('Você não tem compromissos hoje.');
  } else {
    vozNotify(`📅 Hoje: ${deHoje.length} compromisso(s)`, 'ok');
    falar(`Você tem ${deHoje.length} compromisso${deHoje.length > 1 ? 's' : ''} hoje. ${deHoje.map(e => `${e.title} às ${e.time}`).join('. ')}`);
  }
}

function proximoCompromisso() {
  const eventos = JSON.parse(localStorage.getItem('events') || '[]');
  const now = new Date();
  const agoraStr = now.toISOString().split('T')[0] + now.toTimeString().slice(0,5);
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
  setTimeout(() => { window.location.href = url; }, 600); // 600ms = mais rápido
}

function falar(texto) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    u.rate = 1.1; // um pouco mais rápido
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
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

function atualizarBotaoVoz(ativo) {
  const btn = document.getElementById('voz-fab');
  if (!btn) return;
  btn.textContent = ativo ? '🎙️' : '🎤';
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
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #0a1520;
      border: 2px solid #0d2a3f;
      font-size: 28px;
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      transition: all 0.3s;
    }
    .voz-fab.ativo {
      border-color: #ff4466;
      background: rgba(255,68,102,0.15);
      box-shadow: 0 0 24px rgba(255,68,102,0.5);
      animation: vozPulse 1.8s ease-in-out infinite;
    }
    @keyframes vozPulse {
      0%,100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .voz-notify {
      position: fixed;
      bottom: 104px;
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
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      animation: vozSlide 0.2s ease;
    }
    .voz-ok   { border: 1px solid #00ff88; color: #00ff88; }
    .voz-erro { border: 1px solid #ff4466; color: #ff4466; }
    .voz-info { border: 1px solid #00d4ff; color: #00d4ff; }
    @keyframes vozSlide {
      from { opacity: 0; transform: translateX(16px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .voz-ouvindo {
      position: fixed;
      bottom: 104px;
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
      max-width: 200px;
      display: none;
    }
    .voz-fab.ativo ~ * ~ .voz-ouvindo { display: block; }
  `;
  document.head.appendChild(style);

  const fab = document.createElement('button');
  fab.id = 'voz-fab';
  fab.className = 'voz-fab';
  fab.textContent = '🎤';
  fab.onclick = toggleVoz;
  document.body.appendChild(fab);

  const notify = document.createElement('div');
  notify.id = 'voz-notify';
  notify.className = 'voz-notify';
  document.body.appendChild(notify);

  const ouvindo = document.createElement('div');
  ouvindo.id = 'voz-texto';
  ouvindo.className = 'voz-ouvindo';
  ouvindo.textContent = '...';
  document.body.appendChild(ouvindo);
}

window.addEventListener('DOMContentLoaded', injetarUI);
