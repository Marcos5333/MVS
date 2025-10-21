/* painel.js - versão atualizada com módulo "Estudos" e painel resumo */
/* Mantém: clientes, projetos, agenda, modais, confirmações, enter nos modais */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// ------------------ Config Firebase ------------------
const firebaseConfig = {
  apiKey: "AIzaSyCinr-cHlnww6oqPKI2Mv-tmii84uxkJJI",
  authDomain: "mvsz-4007f.firebaseapp.com",
  projectId: "mvsz-4007f",
  storageBucket: "mvsz-4007f.firebasestorage.app",
  messagingSenderId: "873804242584",
  appId: "1:873804242584:web:d025c8a206b14f62973aed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ------------------ Verifica Login ------------------
onAuthStateChanged(auth, user => {
  const isPainelPage = window.location.pathname.endsWith("painel.html");
  if(!user && isPainelPage){
    window.location.href = "index.html";
  }
});

// ------------------ Painel ------------------
document.addEventListener("DOMContentLoaded", async () => {

  // ---------- Seções ----------
  const sections = document.querySelectorAll("main > section");
  const sidebarLinks = document.querySelectorAll(".sidebar ul li a");

  function showSection(sectionId) {
    sections.forEach(sec => sec.style.display = "none");
    sidebarLinks.forEach(link => link.classList.remove("active"));

    const section = document.getElementById(sectionId);
    if(section) section.style.display = "block";

    const activeLink = Array.from(sidebarLinks).find(link => link.dataset.section === sectionId);
    if(activeLink) activeLink.classList.add("active");
  }

  // Inicializa com dashboard aberto
  showSection("dashboard");

  sidebarLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  // ---------- Dark Mode ----------
  const darkSwitch = document.getElementById("dark-mode-switch");
  if(darkSwitch){
    darkSwitch.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode", darkSwitch.checked);
    });
  }

  // ---------- Modais (Clientes / Projetos / Agenda) ----------
  const modalCliente = document.getElementById("modal-cliente");
  const modalProjeto = document.getElementById("modal-projeto");
  const modalAgenda = document.getElementById("modal-agenda");

  const abrirFecharModal = (botaoAbrir, modal, botaoFechar) => {
    if(botaoAbrir) botaoAbrir.addEventListener("click", () => modal.style.display = "flex");
    if(botaoFechar) botaoFechar.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", e => {
      if(e.target === modal) modal.style.display = "none";
    });
  };

  abrirFecharModal(document.getElementById("open-cliente-modal"), modalCliente, document.getElementById("close-cliente-modal"));
  abrirFecharModal(document.getElementById("open-projeto-modal"), modalProjeto, document.getElementById("close-projeto-modal"));
  abrirFecharModal(document.getElementById("open-agenda-modal"), modalAgenda, document.getElementById("close-agenda-modal"));

  // ---------- ENTER nos Modais ----------
  if(modalCliente) modalCliente.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); document.getElementById("salvar-cliente-btn").click(); } });
  if(modalProjeto) modalProjeto.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); document.getElementById("salvar-projeto-btn").click(); } });
  if(modalAgenda) modalAgenda.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); document.getElementById("salvar-evento").click(); } });

  // ---------- Funções de modal (confirm / alerta) ----------
  function modalConfirmacao(mensagem, callback){
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-content">
        <p>${mensagem}</p>
        <div style="display:flex;justify-content:space-between;margin-top:20px;">
          <button id="confirmar" class="primary">Sim</button>
          <button id="cancelar" class="btn-excluir">Não</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#confirmar").addEventListener("click", () => {
      try { callback(); } catch(e){ console.error(e); }
      modal.remove();
    });
    modal.querySelector("#cancelar").addEventListener("click", () => modal.remove());
    window.addEventListener("click", e => { if(e.target === modal) modal.remove(); }, { once: true });
  }

  function modalAlerta(mensagem){
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-content">
        <p>${mensagem}</p>
        <button id="fechar" class="primary">Fechar</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#fechar").addEventListener("click", () => modal.remove());
    window.addEventListener("click", e => { if(e.target === modal) modal.remove(); }, { once: true });
  }

  // ---------- AGENDA (mantém seu código) ----------
  const tituloInput = document.getElementById("evento-titulo");
  const dataInput = document.getElementById("evento-data");
  const horaInput = document.getElementById("evento-hora");
  const listaEventos = document.getElementById("lista-eventos");
  const buscaEvento = document.getElementById("busca-evento");
  const salvarEventoBtn = document.getElementById("salvar-evento");
  let eventos = [];

  function renderizarEventos(filtro = "") {
    if(!listaEventos) return;
    listaEventos.innerHTML = "";
    const filtrados = eventos
      .filter(ev => ev.titulo.toLowerCase().includes(filtro.toLowerCase()))
      .sort((a,b) => new Date(a.data.split("/").reverse().join("-") + " " + a.hora) - new Date(b.data.split("/").reverse().join("-") + " " + b.hora));

    if (filtrados.length === 0){
      listaEventos.innerHTML = `<p style="color:#999;">Nenhum evento encontrado.</p>`;
      return;
    }

    filtrados.forEach(ev => {
      const card = document.createElement("div");
      card.classList.add("evento-card");
      card.innerHTML = `
        <div class="evento-info">
          <h4>${ev.titulo}</h4>
          <p>📅 ${ev.data} ⏰ ${ev.hora}</p>
        </div>
        <button class="btn-excluir-evento">Excluir</button>
      `;
      card.querySelector(".btn-excluir-evento").addEventListener("click", async () => {
        modalConfirmacao("Deseja realmente excluir este evento?", async () => {
          await deleteDoc(doc(db, "eventos", ev.id));
          eventos = eventos.filter(x => x.id !== ev.id);
          renderizarEventos();
          await carregarCompromissosHoje();
          renderUltimosEventos();
        });
      });
      listaEventos.appendChild(card);
    });
  }

  if(buscaEvento){
    buscaEvento.addEventListener("input", e => renderizarEventos(e.target.value));
    buscaEvento.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); renderizarEventos(buscaEvento.value); } });
  }

  async function carregarEventos() {
    const snapshot = await getDocs(collection(db, "eventos"));
    eventos = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    renderizarEventos();
    renderUltimosEventsContainer && renderUltimosEventsContainer();
  }
  await carregarEventos();

  if(salvarEventoBtn){
    salvarEventoBtn.addEventListener("click", async () => {
      const titulo = tituloInput.value.trim();
      const data = dataInput.value;
      const hora = horaInput.value;

      if(!titulo || !data || !hora){
        modalAlerta("Preencha todos os campos!");
        return;
      }

      const partes = data.split("-");
      const dataBR = `${partes[2]}/${partes[1]}/${partes[0]}`;

      const novoEvento = { titulo, data: dataBR, hora };
      const ref = await addDoc(collection(db, "eventos"), novoEvento);
      novoEvento.id = ref.id;
      eventos.push(novoEvento);
      renderizarEventos();

      tituloInput.value = "";
      dataInput.value = "";
      horaInput.value = "";
      modalAgenda.style.display = "none";

      await carregarCompromissosHoje();
      renderUltimosEventos();
    });
  }

  // ---------- COMPROMISSOS DE HOJE (Dashboard) ----------
  async function carregarCompromissosHoje() {
    const listaHoje = document.getElementById("lista-hoje");
    if(!listaHoje) return;

    const snapshot = await getDocs(collection(db, "eventos"));
    const todosEventos = snapshot.docs.map(docSnap => docSnap.data());

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth()+1).padStart(2, "0");
    const ano = hoje.getFullYear();
    const dataHoje = `${dia}/${mes}/${ano}`;

    const eventosHoje = todosEventos.filter(ev => ev.data === dataHoje).sort((a,b) => a.hora.localeCompare(b.hora));
    listaHoje.innerHTML = eventosHoje.length ? eventosHoje.map(ev => `<li><strong>${ev.titulo}</strong> <span>${ev.hora}</span></li>`).join("") : `<li>Nenhum compromisso para hoje 🎉</li>`;
  }
  await carregarCompromissosHoje();

  // ---------- CLIENTES ----------
  const tabelaClientes = document.querySelector("#tabela-clientes tbody");
  let editarClienteAtual = null;

  async function carregarClientes() {
    if(!tabelaClientes) return;
    tabelaClientes.innerHTML = "";
    const snapshot = await getDocs(collection(db, "clientes"));

    if(snapshot.empty){
      tabelaClientes.innerHTML = `<tr><td colspan="5">Nenhum cliente cadastrado.</td></tr>`;
      atualizarTotalClientes();
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const tr = document.createElement("tr");
      tr.dataset.id = docSnap.id;
      tr.dataset.nome = data.nome;
      tr.dataset.email = data.email;
      tr.dataset.telefone = data.telefone;
      tr.dataset.servico = data.servico;

      tr.innerHTML = `
        <td>${data.nome}</td>
        <td>${data.email}</td>
        <td>${data.telefone}</td>
        <td>${data.servico}</td>
        <td>
          <button class="btn-editar">Editar</button>
          <button class="btn-excluir">Excluir</button>
        </td>
      `;

      tr.querySelector(".btn-editar").addEventListener("click", () => {
        document.getElementById("cliente-nome").value = data.nome;
        document.getElementById("cliente-email").value = data.email;
        document.getElementById("cliente-telefone").value = data.telefone;
        document.getElementById("cliente-servico").value = data.servico;
        editarClienteAtual = tr;
        modalCliente.style.display = "flex";
      });

      tr.querySelector(".btn-excluir").addEventListener("click", async () => {
        modalConfirmacao(`Deseja realmente excluir ${data.nome}?`, async () => {
          await deleteDoc(doc(db, "clientes", docSnap.id));
          tr.remove();
          atualizarTotalClientes();
        });
      });

      tabelaClientes.appendChild(tr);
    });

    atualizarTotalClientes();
  }

  function atualizarTotalClientes() {
    const el = document.getElementById("total-clientes");
    if(el) el.textContent = tabelaClientes ? tabelaClientes.children.length : "0";
    atualizarDropdownClientes();
  }

  function atualizarDropdownClientes() {
    const selectProjetoCliente = document.getElementById("projeto-cliente");
    if(!selectProjetoCliente) return;
    selectProjetoCliente.innerHTML = `<option value="">Selecione o cliente</option>`;
    tabelaClientes.querySelectorAll("tr").forEach(tr => {
      const option = document.createElement("option");
      option.value = tr.dataset.id;
      option.textContent = tr.dataset.nome;
      selectProjetoCliente.appendChild(option);
    });
  }

  await carregarClientes();

  // ---------- PROJETOS ----------
  const tabelaProjetos = document.querySelector("#tabela-projetos tbody");
  let editarProjetoAtual = null;

  async function carregarProjetos() {
  if (!tabelaProjetos) return;
  tabelaProjetos.innerHTML = "";

  const snapshot = await getDocs(collection(db, "projetos"));

  if (snapshot.empty) {
    tabelaProjetos.innerHTML = `<tr><td colspan="3">Nenhum projeto cadastrado.</td></tr>`;
    atualizarTotalProjetos();
    renderProjetosCards(); // atualiza cards mesmo sem projetos
    return;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const tr = document.createElement("tr");
    tr.dataset.id = docSnap.id;
    tr.dataset.nome = data.nome;
    tr.dataset.cliente = data.cliente;

    tr.innerHTML = `
      <td>${data.nome}</td>
      <td>${data.clienteNome || ""}</td>
      <td>
        <button class="btn-editar">Editar</button>
        <button class="btn-excluir">Excluir</button>
      </td>
    `;

    // Editar projeto
    tr.querySelector(".btn-editar").addEventListener("click", () => {
      document.getElementById("projeto-nome").value = data.nome;
      document.getElementById("projeto-cliente").value = data.cliente;
      editarProjetoAtual = tr;
      modalProjeto.style.display = "flex";
    });

    // Excluir projeto
    tr.querySelector(".btn-excluir").addEventListener("click", async () => {
      modalConfirmacao(`Deseja realmente excluir ${data.nome}?`, async () => {
        await deleteDoc(doc(db, "projetos", docSnap.id));
        tr.remove();
        atualizarTotalProjetos();
        await renderProjetosCards(); // atualiza cards após exclusão
      });
    });

    tabelaProjetos.appendChild(tr);
  });

  atualizarTotalProjetos();
  renderProjetosCards(); // atualiza cards após carregar todos os projetos
}


  function atualizarTotalProjetos() {
    const el = document.getElementById("total-projetos");
    if(el) el.textContent = tabelaProjetos ? tabelaProjetos.children.length : "0";
  }

  await carregarProjetos();

  // ---------- Salvar Cliente ----------
  const salvarClienteBtn = document.getElementById("salvar-cliente-btn");
  if(salvarClienteBtn){
    salvarClienteBtn.addEventListener("click", async (e) => {
      const botao = e.target;
      botao.disabled = true;

      const nome = document.getElementById("cliente-nome").value.trim();
      const email = document.getElementById("cliente-email").value.trim();
      const telefone = document.getElementById("cliente-telefone").value.trim();
      const servico = document.getElementById("cliente-servico").value.trim();

      if(!nome || !email){
        modalAlerta("Preencha nome e email");
        botao.disabled = false;
        return;
      }

      if(editarClienteAtual){
        await updateDoc(doc(db, "clientes", editarClienteAtual.dataset.id), { nome, email, telefone, servico });
        editarClienteAtual = null;
      } else {
        await addDoc(collection(db, "clientes"), { nome, email, telefone, servico });
      }

      await carregarClientes();

      document.getElementById("cliente-nome").value = "";
      document.getElementById("cliente-email").value = "";
      document.getElementById("cliente-telefone").value = "";
      document.getElementById("cliente-servico").value = "";

      modalCliente.style.display = "none";
      botao.disabled = false;
    });
  }

  // ---------- Salvar Projeto ----------
 const salvarProjetoBtn = document.getElementById("salvar-projeto-btn");

if (salvarProjetoBtn) {
  salvarProjetoBtn.addEventListener("click", async (e) => {
    const botao = e.target;
    botao.disabled = true;

    const nome = document.getElementById("projeto-nome").value.trim();
    const clienteId = document.getElementById("projeto-cliente").value;
    const clienteNome = document.getElementById("projeto-cliente").options[document.getElementById("projeto-cliente").selectedIndex].text;

    if (!nome || !clienteId) {
      modalAlerta("Preencha nome do projeto e selecione cliente");
      botao.disabled = false;
      return;
    }

    // Pegar arquivo selecionado
    const fileInput = document.getElementById("projeto-imagem-file");
    let imagemUrl = "";

    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const storageReference = storageRef(storage, `projetos/${Date.now()}_${file.name}`);
      
      // Faz upload
      await uploadBytes(storageReference, file);

      // Pega URL da imagem
      imagemUrl = await getDownloadURL(storageReference);
    }

    const projetoData = {
      nome,
      cliente: clienteId,
      clienteNome,
      status: "Em andamento",
      imagem: imagemUrl // salva a URL
    };

    if (editarProjetoAtual) {
      await updateDoc(doc(db, "projetos", editarProjetoAtual.dataset.id), projetoData);
      editarProjetoAtual = null;
    } else {
      await addDoc(collection(db, "projetos"), projetoData);
    }

    // Limpa inputs
    document.getElementById("projeto-nome").value = "";
    document.getElementById("projeto-cliente").value = "";
    if(fileInput) fileInput.value = "";

    modalProjeto.style.display = "none";

    // Atualiza tabela e cards
    await carregarProjetos();
    botao.disabled = false;
  });
}


  // ---------- Logout ----------
  const logoutBtn = document.getElementById("logout-btn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => window.location.href = "index.html")
        .catch(err => modalAlerta("Erro ao sair: " + err.message));
    });
  }

  /* ==================== NOVA ÁREA: ESTUDOS + DASHBOARD RESUMO ==================== */

  // --- Inserir blocos no dashboard (abaixo da seção compromissos) ---
  const dashboardSection = document.getElementById("dashboard");
  if(dashboardSection){
    // container para o resumo
    const resumoContainer = document.createElement("div");
    resumoContainer.id = "resumo-estudos";
    resumoContainer.style.marginTop = "20px";
    resumoContainer.innerHTML = `
      <div class="section-header">
        <h1>Visão Geral / Resumo</h1>
        <div style="display:flex; gap:10px; align-items:center;">
          <button id="open-estudo-modal" class="primary">+ Registrar Estudo</button>
          <div style="display:flex; gap:8px; align-items:center;">
            <label style="font-size:0.9rem;">Meta semanal (h):</label>
            <input id="meta-semanal" type="number" min="1" value="10" style="width:70px; padding:6px; border-radius:6px; border:1px solid #ccc;">
          </div>
        </div>
      </div>

      <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
        <div class="card" style="flex:1 1 320px; min-width:260px;">
          <h3>Progresso Semanal</h3>
          <canvas id="grafico-semanal" style="width:100%;max-height:220px;"></canvas>
        </div>

        <div style="flex:1 1 300px; min-width:220px;">
          <div class="card" id="cards-projetos-container" style="margin-bottom:12px;">
            <h3>Projetos em andamento</h3>
            <div id="cards-projetos" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>

          <div class="card" id="ultimos-eventos-card">
            <h3>Últimos eventos</h3>
            <div id="ultimos-eventos-lista"></div>
          </div>
        </div>
      </div>
    `;
    // inserir após compromissos-hoje card
    const compromissosCard = dashboardSection.querySelector(".compromissos-hoje");
    if(compromissosCard && compromissosCard.parentNode){
      compromissosCard.parentNode.insertBefore(resumoContainer, compromissosCard.nextSibling);
    } else {
      dashboardSection.appendChild(resumoContainer);
    }
  }

  // --- Criar modal de estudo (dinâmico) ---
  const modalEstudoHtml = `
    <div id="modal-estudo" class="modal">
      <div class="modal-content">
        <span class="close" id="close-estudo-modal">&times;</span>
        <h2>Registrar Sessão de Estudo</h2>
        <input id="estudo-materia" placeholder="Matéria / Assunto">
        <select id="estudo-projeto">
          <option value="">Nenhum projeto</option>
        </select>
        <div style="display:flex; gap:8px;">
          <input id="estudo-horas" type="number" min="0" placeholder="Horas" style="flex:1">
          <input id="estudo-minutos" type="number" min="0" max="59" placeholder="Minutos" style="flex:1">
        </div>
        <button id="salvar-estudo-btn" class="primary" style="margin-top:10px;">Salvar Estudo</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalEstudoHtml);

  const modalEstudo = document.getElementById("modal-estudo");
  const openEstudoModalBtn = document.getElementById("open-estudo-modal");
  const closeEstudoModalBtn = document.getElementById("close-estudo-modal");
  const estudoMateria = document.getElementById("estudo-materia");
  const estudoProjetoSelect = document.getElementById("estudo-projeto");
  const estudoHoras = document.getElementById("estudo-horas");
  const estudoMinutos = document.getElementById("estudo-minutos");
  const salvarEstudoBtn = document.getElementById("salvar-estudo-btn");

  if(openEstudoModalBtn) openEstudoModalBtn.addEventListener("click", () => modalEstudo.style.display = "flex");
  if(closeEstudoModalBtn) closeEstudoModalBtn.addEventListener("click", () => modalEstudo.style.display = "none");
  modalEstudo.addEventListener("click", e => { if(e.target === modalEstudo) modalEstudo.style.display = "none"; });
  modalEstudo.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); salvarEstudoBtn.click(); } });

  // --- Chart.js (carregar dinamicamente) ---
  let Chart = null;
  async function loadChartJs(){
    if(window.Chart) { Chart = window.Chart; return; }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
      s.onload = () => { Chart = window.Chart; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // --- Render gráfico semanal ---
  let graficoInstance = null;
  async function renderGraficoSemanal(estudosRaw){
    await loadChartJs().catch(()=>{ /* falha no load: fallback visual */ });
    const canvas = document.getElementById("grafico-semanal");
    if(!canvas) return;

    // prepara últimos 7 dias
    const hoje = new Date();
    const labels = [];
    const dataHoras = [];
    for(let i=6;i>=0;i--){
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
      const label = `${d.getDate()}/${d.getMonth()+1}`;
      labels.push(label);
      const str = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
      const total = estudosRaw.filter(e => e.data === str).reduce((acc, e) => acc + Number(e.horas || 0) + (Number(e.minutos || 0)/60), 0);
      dataHoras.push(Number(total.toFixed(2)));
    }

    const metaInput = document.getElementById("meta-semanal");
    const meta = metaInput ? Number(metaInput.value) || 10 : 10;

    // se Chart disponível, desenha gráfico de barras; caso contrário desenha barras simples em HTML
    if(Chart){
      if(graficoInstance) graficoInstance.destroy();
      graficoInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Horas estudadas',
            data: dataHoras,
            backgroundColor: 'rgba(64,115,158,0.9)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Meta semanal: ${meta}h` }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    } else {
      // fallback: barras simples em HTML (se Chart.js falhar)
      canvas.style.display = "none";
      const parent = document.getElementById("grafico-semanal").parentNode;
      if(!parent.querySelector(".fallback-bars")){
        const wrap = document.createElement("div");
        wrap.className = "fallback-bars";
        wrap.style.display = "flex";
        wrap.style.gap = "8px";
        wrap.style.alignItems = "end";
        wrap.style.height = "140px";
        dataHoras.forEach(h => {
          const bar = document.createElement("div");
          bar.style.width = "10%";
          bar.style.height = `${Math.min(140, h*14)}px`;
          bar.style.background = "#40739e";
          bar.title = `${h}h`;
          wrap.appendChild(bar);
        });
        parent.appendChild(wrap);
      }
    }
  }

  // --- Render projetos em cards ---
  async function renderProjetosCards(){
    const container = document.getElementById("cards-projetos");
    if(!container) return;
    container.innerHTML = "";
    const snapshot = await getDocs(collection(db, "projetos"));
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if(docs.length === 0){
      container.innerHTML = "<div>Nenhum projeto cadastrado</div>";
      return;
    }

    docs.forEach(p => {
      const card = document.createElement("div");
      card.style.display = "flex";
      card.style.justifyContent = "space-between";
      card.style.alignItems = "center";
      card.style.background = "transparent";
      card.style.borderRadius = "8px";

      let statusText = p.status || "Em andamento";
      // opção: calcular progresso se existir 'progresso' campo
      const progresso = p.progresso ? Math.min(100, Number(p.progresso)) : Math.floor(Math.random()*60)+10; // fallback demo

      card.innerHTML = `
        <div style="flex:1;">
          <strong>${p.nome}</strong>
          <div style="font-size:0.9rem;color:#666;">${p.clienteNome || ""}</div>
        </div>
        <div style="width:140px;text-align:right">
          <div style="font-size:0.85rem;margin-bottom:6px">${statusText}</div>
          <div style="background:#eee;border-radius:8px;overflow:hidden;height:10px;">
            <div style="width:${progresso}%;height:10px;background:#4caf50"></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // preencher select de projetos no modal de estudo
    if(estudoProjetoSelect){
      estudoProjetoSelect.innerHTML = `<option value="">Nenhum projeto</option>`;
      docs.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nome;
        estudoProjetoSelect.appendChild(opt);
      });
    }
  }

  // --- Render últimos eventos (3 recentes) ---
  async function renderUltimosEventos(){
    const out = document.getElementById("ultimos-eventos-lista");
    if(!out) return;
    // busca 5 eventos ordenados pela data/hora (obs: data em dd/mm/aaaa, ordenar convertendo)
    const snapshot = await getDocs(collection(db, "eventos"));
    const docs = snapshot.docs.map(d => d.data()).sort((a,b) => {
      const da = new Date(a.data.split("/").reverse().join("-") + " " + (a.hora || ""));
      const dbb = new Date(b.data.split("/").reverse().join("-") + " " + (b.hora || ""));
      return dbb - da;
    }).slice(0,5);
    out.innerHTML = docs.length ? `<ul style="list-style:none;padding-left:0;margin:0;">${docs.map(d => `<li style="margin-bottom:8px;">${d.titulo} — ${d.data} ${d.hora?("&nbsp;⏰ "+d.hora):""}</li>`).join("")}</ul>` : "<div>Nenhum evento recente</div>";
  }

  // --- Carregar estudos do Firestore ---
  async function carregarEstudos() {
    const snapshot = await getDocs(collection(db, "estudos"));
    const estudos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // padroniza data dd/mm/yyyy
    estudos.forEach(e => {
      if(!e.data){
        const dt = new Date();
        e.data = `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
      }
    });
    // render
    await renderGraficoSemanal(estudos);
    await renderProjetosCards();
    await renderUltimosEventos();
  }

  await carregarEstudos();

  // --- Salvar estudo ---
  if(salvarEstudoBtn){
    salvarEstudoBtn.addEventListener("click", async () => {
      const materia = estudoMateria.value.trim();
      const projetoId = estudoProjetoSelect.value || "";
      const horas = Number(estudoHoras.value) || 0;
      const minutos = Number(estudoMinutos.value) || 0;

      if(!materia || (horas === 0 && minutos === 0)){
        modalAlerta("Preencha matéria e duração do estudo");
        return;
      }

      const hoje = new Date();
      const dataStr = `${String(hoje.getDate()).padStart(2,"0")}/${String(hoje.getMonth()+1).padStart(2,"0")}/${hoje.getFullYear()}`;

      const novo = {
        materia,
        projetoId,
        horas,
        minutos,
        data: dataStr,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "estudos"), novo);

      // limpar
      estudoMateria.value = "";
      estudoProjetoSelect.value = "";
      estudoHoras.value = "";
      estudoMinutos.value = "";
      modalEstudo.style.display = "none";

      await carregarEstudos();
    });
  }

  // recompute gráfico quando alterar meta
  const metaInput = document.getElementById("meta-semanal");
  if(metaInput){
    metaInput.addEventListener("change", async () => {
      await carregarEstudos();
    });
  }

  // expose small helper to render after events changes
  function renderUltimosEventsContainer(){
    renderUltimosEventos();
  }

  /* ==================== FIM: ESTUDOS + RESUMO ==================== */

  // --------------------------------------------------------------------------------
  // rest of functions already implemented above handle clients/projects saving etc.
  // --------------------------------------------------------------------------------

}); // end DOMContentLoaded


// ---------- Cards de Projetos no Dashboard com Imagem ----------
async function renderizarProjetosDashboard() {
  const container = document.getElementById("lista-projetos-dashboard");
  if (!container) return;

  container.innerHTML = ""; // Limpa os cards existentes

  // Pega todos os projetos do Firestore
  const snapshot = await getDocs(collection(db, "projetos"));
  const projetos = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

  if (projetos.length === 0) {
    container.innerHTML = `<p style="color:#999;">Nenhum projeto cadastrado.</p>`;
    return;
  }

  projetos.forEach(proj => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.style.cursor = "pointer";

    // Se não houver imagem, usar placeholder
    const imagemProjeto = proj.imagem && proj.imagem !== "" 
      ? proj.imagem 
      : "https://via.placeholder.com/100x60?text=Projeto";

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${imagemProjeto}" alt="${proj.nome}" style="width:100px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #ccc;">
        <div>
          <h4 style="margin:0;">${proj.nome}</h4>
          <p style="margin:0; font-size:0.85rem; color:#666;"><strong>Cliente:</strong> ${proj.clienteNome || ""}</p>
          <p style="margin:0; font-size:0.8rem; color:#999;"><strong>Status:</strong> ${proj.status || "Em andamento"}</p>
        </div>
      </div>
    `;

    // Clique abre modal de detalhes
    card.addEventListener("click", () => {
      document.getElementById("detalhes-projeto-nome").textContent = proj.nome;
      document.getElementById("detalhes-projeto-cliente").textContent = proj.clienteNome || "";
      document.getElementById("detalhes-projeto-descricao").textContent = proj.descricao || "Sem descrição.";
      document.getElementById("detalhes-projeto-status").textContent = proj.status || "Em andamento";
      document.getElementById("modal-detalhes-projeto").style.display = "flex";
    });

    container.appendChild(card);
  });
}

// ---------- Fecha modal de detalhes ----------
const modalDetalhesProjeto = document.getElementById("modal-detalhes-projeto");
document.getElementById("close-detalhes-projeto").addEventListener("click", () => {
  modalDetalhesProjeto.style.display = "none";
});

// ---------- Chama a função após carregar projetos ----------
renderizarProjetosDashboard();



