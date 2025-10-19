import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
  darkSwitch.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode", darkSwitch.checked);
  });

  // ---------- Modais ----------
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
  modalCliente.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); document.getElementById("salvar-cliente-btn").click(); } });
  modalProjeto.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); document.getElementById("salvar-projeto-btn").click(); } });
  modalAgenda.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); document.getElementById("salvar-evento").click(); } });

  // ---------- Agenda ----------
  const tituloInput = document.getElementById("evento-titulo");
  const dataInput = document.getElementById("evento-data");
  const horaInput = document.getElementById("evento-hora");
  const listaEventos = document.getElementById("lista-eventos");
  const buscaEvento = document.getElementById("busca-evento");
  const salvarEventoBtn = document.getElementById("salvar-evento");
  let eventos = [];

  function renderizarEventos(filtro = "") {
    listaEventos.innerHTML = "";
    const filtrados = eventos
      .filter(ev => ev.titulo.toLowerCase().includes(filtro.toLowerCase()))
      .sort((a,b) => new Date(a.data.split("/").reverse().join("-") + " " + a.hora) - new Date(b.data.split("/").reverse().join("-") + " " + b.hora));

    if(filtrados.length === 0){
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
        });
      });
      listaEventos.appendChild(card);
    });
  }

  // Pesquisa com Enter
  buscaEvento.addEventListener("input", e => renderizarEventos(e.target.value));
  buscaEvento.addEventListener("keypress", e => { if(e.key === "Enter"){ e.preventDefault(); renderizarEventos(buscaEvento.value); } });

  async function carregarEventos() {
    const snapshot = await getDocs(collection(db, "eventos"));
    eventos = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    renderizarEventos();
  }
  await carregarEventos();

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
  });

  // ---------- Compromissos de Hoje (Dashboard) ----------
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

  // ---------- Clientes ----------
  const tabelaClientes = document.querySelector("#tabela-clientes tbody");
  let editarClienteAtual = null;

  async function carregarClientes() {
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
    document.getElementById("total-clientes").textContent = tabelaClientes.children.length;
    atualizarDropdownClientes();
  }

  function atualizarDropdownClientes() {
    const selectProjetoCliente = document.getElementById("projeto-cliente");
    selectProjetoCliente.innerHTML = `<option value="">Selecione o cliente</option>`;
    tabelaClientes.querySelectorAll("tr").forEach(tr => {
      const option = document.createElement("option");
      option.value = tr.dataset.id;
      option.textContent = tr.dataset.nome;
      selectProjetoCliente.appendChild(option);
    });
  }

  await carregarClientes();

  // ---------- Projetos ----------
  const tabelaProjetos = document.querySelector("#tabela-projetos tbody");
  let editarProjetoAtual = null;

  async function carregarProjetos() {
    tabelaProjetos.innerHTML = "";
    const snapshot = await getDocs(collection(db, "projetos"));

    if(snapshot.empty){
      tabelaProjetos.innerHTML = `<tr><td colspan="3">Nenhum projeto cadastrado.</td></tr>`;
      atualizarTotalProjetos();
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
        <td>${data.clienteNome}</td>
        <td>
          <button class="btn-editar">Editar</button>
          <button class="btn-excluir">Excluir</button>
        </td>
      `;

      tr.querySelector(".btn-editar").addEventListener("click", () => {
        document.getElementById("projeto-nome").value = data.nome;
        document.getElementById("projeto-cliente").value = data.cliente;
        editarProjetoAtual = tr;
        modalProjeto.style.display = "flex";
      });

      tr.querySelector(".btn-excluir").addEventListener("click", async () => {
        modalConfirmacao(`Deseja realmente excluir ${data.nome}?`, async () => {
          await deleteDoc(doc(db, "projetos", docSnap.id));
          tr.remove();
          atualizarTotalProjetos();
        });
      });

      tabelaProjetos.appendChild(tr);
    });

    atualizarTotalProjetos();
  }

  function atualizarTotalProjetos() {
    document.getElementById("total-projetos").textContent = tabelaProjetos.children.length;
  }

  await carregarProjetos();

  // ---------- Salvar Cliente ----------
  document.getElementById("salvar-cliente-btn").addEventListener("click", async (e) => {
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

  // ---------- Salvar Projeto ----------
  document.getElementById("salvar-projeto-btn").addEventListener("click", async (e) => {
    const botao = e.target;
    botao.disabled = true;

    const nome = document.getElementById("projeto-nome").value.trim();
    const clienteId = document.getElementById("projeto-cliente").value;
    const clienteNome = document.getElementById("projeto-cliente").options[document.getElementById("projeto-cliente").selectedIndex].text;

    if(!nome || !clienteId){
      modalAlerta("Preencha nome do projeto e selecione cliente");
      botao.disabled = false;
      return;
    }

    if(editarProjetoAtual){
      await updateDoc(doc(db, "projetos", editarProjetoAtual.dataset.id), { nome, cliente: clienteId, clienteNome });
      editarProjetoAtual = null;
    } else {
      await addDoc(collection(db, "projetos"), { nome, cliente: clienteId, clienteNome });
    }

    await carregarProjetos();

    document.getElementById("projeto-nome").value = "";
    document.getElementById("projeto-cliente").value = "";

    modalProjeto.style.display = "none";
    botao.disabled = false;
  });

  // ---------- Logout ----------
  const logoutBtn = document.getElementById("logout-btn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => window.location.href = "index.html")
        .catch(err => modalAlerta("Erro ao sair: " + err.message));
    });
  }

  // ---------- Modal de Confirmação ----------
  function modalConfirmacao(mensagem, callback){
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-content">
        <p>${mensagem}</p>
        <div style="display:flex;justify-content:space-between;margin-top:20px;">
          <button id="confirmar">Sim</button>
          <button id="cancelar">Não</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#confirmar").addEventListener("click", () => {
      callback();
      modal.remove();
    });
    modal.querySelector("#cancelar").addEventListener("click", () => modal.remove());
    window.addEventListener("click", e => { if(e.target === modal) modal.remove(); });
  }

  // ---------- Modal de Alerta ----------
  function modalAlerta(mensagem){
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-content">
        <p>${mensagem}</p>
        <button id="fechar">Fechar</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#fechar").addEventListener("click", () => modal.remove());
    window.addEventListener("click", e => { if(e.target === modal) modal.remove(); });
  }

});
