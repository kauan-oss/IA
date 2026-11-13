const chat = document.getElementById('chat');
const form = document.getElementById('form');
const pergunta = document.getElementById('pergunta');
const enviar = document.getElementById('enviar');
const nova = document.getElementById('nova');
const listaConversas = document.getElementById('lista-conversas');
const sidebar = document.getElementById('sidebar');
const abrirSidebar = document.getElementById('abrir-sidebar');
const fecharSidebar = document.getElementById('fechar-sidebar');

let conversa = localStorage.getItem('conversa');
if (!conversa) {
  conversa = crypto.randomUUID();
  localStorage.setItem('conversa', conversa);
}

// Guarda a lista de IDs e títulos das conversas na barra lateral
let conversasSalvas = JSON.parse(localStorage.getItem('conversas_salvas') || '[]');

function salvarConversaNaLista(id, titulo) {
  const existente = conversasSalvas.find((c) => c.id === id);
  if (!existente) {
    conversasSalvas.unshift({ id, titulo });
    localStorage.setItem('conversas_salvas', JSON.stringify(conversasSalvas));
  }
  renderizarSidebar();
}

function renderizarSidebar() {
  listaConversas.textContent = '';

  // Garante que a conversa atual apareça na lista mesmo antes da 1ª mensagem
  const listaParaExibir = [...conversasSalvas];
  if (!listaParaExibir.some((c) => c.id === conversa)) {
    listaParaExibir.unshift({ id: conversa, titulo: 'Nova conversa' });
  }

  for (const item of listaParaExibir) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'item-conversa' + (item.id === conversa ? ' ativa' : '');
    btn.textContent = item.titulo;
    btn.title = item.titulo;

    btn.addEventListener('click', () => {
      if (item.id === conversa) return;
      conversa = item.id;
      localStorage.setItem('conversa', conversa);
      sidebar.classList.remove('aberta');
      renderizarSidebar();
      carregarHistorico();
    });

    listaConversas.appendChild(btn);
  }
}

function mostrar(classe, texto) {
  const div = document.createElement('div');
  div.className = classe;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

// Busca o histórico salvo no banco para a conversa selecionada
async function carregarHistorico() {
  chat.textContent = '';
  try {
    const resposta = await fetch('/historico/' + conversa);
    const mensagens = await resposta.json();
    if (!resposta.ok) throw new Error(mensagens.erro);

    for (const m of mensagens) {
      mostrar('msg ' + m.role, m.content);
    }

    // Se já havia mensagens no banco mas não estava na sidebar, registra o título
    if (mensagens.length > 0) {
      const primeiraUsuario = mensagens.find((m) => m.role === 'user');
      if (primeiraUsuario) {
        salvarConversaNaLista(conversa, primeiraUsuario.content.slice(0, 32));
      }
    }
  } catch (erro) {
    mostrar('msg assistant', 'Erro ao carregar o histórico: ' + erro.message);
  }
}

renderizarSidebar();
carregarHistorico();

nova.addEventListener('click', () => {
  conversa = crypto.randomUUID();
  localStorage.setItem('conversa', conversa);
  chat.textContent = '';
  sidebar.classList.remove('aberta');
  renderizarSidebar();
  pergunta.focus();
});

// Controles da barra lateral no celular
abrirSidebar.addEventListener('click', () => sidebar.classList.add('aberta'));
fecharSidebar.addEventListener('click', () => sidebar.classList.remove('aberta'));

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const texto = pergunta.value.trim();
  if (!texto) return;

  // Define o título da conversa na barra lateral usando a primeira pergunta
  salvarConversaNaLista(conversa, texto.slice(0, 32));

  mostrar('msg user', texto);
  pergunta.value = '';
  enviar.disabled = true;
  const balao = mostrar('msg assistant', 'Pensando...');

  try {
    const resposta = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversa: conversa, texto: texto })
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro);

    balao.textContent = dados.resposta;
    if (dados.ferramentas && dados.ferramentas.length > 0) {
      mostrar('ferramentas', 'Consultou: ' + dados.ferramentas.join(', '));
    }
  } catch (erro) {
    balao.textContent = 'Erro: ' + erro.message;
  }

  enviar.disabled = false;
  pergunta.focus();
});