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

  // ----- Seções e modais -----
  const modalCliente = document.getElementById("modal-cliente");
  const modalProjeto = document.getElementById("modal-projeto");
  const tabelaClientes = document.querySelector("#tabela-clientes tbody");
  const tabelaProjetos = document.querySelector("#tabela-projetos tbody");
  const selectProjetoCliente = document.getElementById("projeto-cliente");

  const agendaSection = document.getElementById('agenda');
  let agendaList, adicionarBtn, tituloInput, dataInput, horaInput;

 // ----- Agenda -----
if(agendaSection){
  agendaList = agendaSection.querySelector('#proximos-eventos');
  adicionarBtn = agendaSection.querySelector('#adicionar-evento');
  tituloInput = agendaSection.querySelector('#evento-titulo');
  dataInput = agendaSection.querySelector('#evento-data');
  horaInput = agendaSection.querySelector('#evento-hora');

  adicionarBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const titulo = tituloInput.value.trim();
    const data = dataInput.value.trim();
    const hora = horaInput.value.trim();

    if(!titulo || !data || !hora){
      return alert('Preencha todos os campos');
    }

    const partes = data.split('-');
    const dataBR = `${partes[2]}/${partes[1]}/${partes[0]}`;

    const div = document.createElement('div');
    div.classList.add('agenda-evento');
    div.innerHTML = `<span>${dataBR} ${hora} - ${titulo}</span> <button class="remover-evento">X</button>`;

    div.querySelector('.remover-evento').addEventListener('click', () => div.remove());

    // Agora vai aparecer
    agendaList.appendChild(div);

    tituloInput.value = '';
    dataInput.value = '';
    horaInput.value = '';
  });
}



  let editarClienteAtual = null;
  let editarProjetoAtual = null;

  modalCliente.style.display = "none";
  modalProjeto.style.display = "none";

  // ----- Troca de seções via sidebar -----
  document.querySelectorAll(".sidebar ul li a").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  function showSection(sectionId) {
    document.querySelectorAll("main > section").forEach(section => section.style.display = "none");
    document.querySelectorAll(".sidebar ul li a").forEach(link => link.classList.remove("active"));

    const section = document.getElementById(sectionId);
    if(section) section.style.display = "block";

    const activeLink = Array.from(document.querySelectorAll(".sidebar ul li a"))
      .find(link => link.dataset.section === sectionId);
    if(activeLink) activeLink.classList.add("active");
  }

  // Inicializa com dashboard aberto
  showSection("dashboard");

  // ----- Dark Mode -----
  const darkSwitch = document.getElementById("dark-mode-switch");
  darkSwitch.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode", darkSwitch.checked);
  });

  // ----- Atualização de totais -----
  function atualizarTotalClientes() {
    document.getElementById("total-clientes").textContent = tabelaClientes.children.length;
    atualizarDropdownClientes();
  }

  function atualizarTotalProjetos() {
    document.getElementById("total-projetos").textContent = tabelaProjetos.children.length;
  }

  function atualizarDropdownClientes() {
    selectProjetoCliente.innerHTML = `<option value="">Selecione o cliente</option>`;
    tabelaClientes.querySelectorAll("tr").forEach(tr => {
      const option = document.createElement("option");
      option.value = tr.dataset.id;
      option.textContent = tr.dataset.nome;
      selectProjetoCliente.appendChild(option);
    });
  }

  // ----- Carregar Clientes -----
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
        <td class="nome">${data.nome}</td>
        <td class="email">${data.email}</td>
        <td class="telefone">${data.telefone}</td>
        <td class="servico">${data.servico}</td>
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
        if(confirm(`Deseja realmente excluir ${data.nome}?`)){
          await deleteDoc(doc(db, "clientes", docSnap.id));
          tr.remove();
          atualizarTotalClientes();
        }
      });

      tabelaClientes.appendChild(tr);
    });

    atualizarTotalClientes();
  }

  // ----- Carregar Projetos -----
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
        <td class="nome">${data.nome}</td>
        <td class="cliente">${data.clienteNome}</td>
        <td>
          <button class="btn-editar">Editar</button>
          <button class="btn-excluir">Excluir</button>
        </td>
      `;

      tr.querySelector(".btn-editar").addEventListener("click", () => {
        document.getElementById("projeto-nome").value = data.nome;
        selectProjetoCliente.value = data.cliente;
        editarProjetoAtual = tr;
        modalProjeto.style.display = "flex";
      });

      tr.querySelector(".btn-excluir").addEventListener("click", async () => {
        if(confirm(`Deseja realmente excluir ${data.nome}?`)){
          await deleteDoc(doc(db, "projetos", docSnap.id));
          tr.remove();
          atualizarTotalProjetos();
        }
      });

      tabelaProjetos.appendChild(tr);
    });

    atualizarTotalProjetos();
  }

  await carregarClientes();
  await carregarProjetos();

  // ----- Abrir/Fechar Modais -----
  document.getElementById("open-cliente-modal").addEventListener("click", () => modalCliente.style.display = "flex");
  document.getElementById("close-cliente-modal").addEventListener("click", () => modalCliente.style.display = "none");
  document.getElementById("open-projeto-modal").addEventListener("click", () => modalProjeto.style.display = "flex");
  document.getElementById("close-projeto-modal").addEventListener("click", () => modalProjeto.style.display = "none");

  window.addEventListener("click", e => {
    if(e.target === modalCliente) modalCliente.style.display = "none";
    if(e.target === modalProjeto) modalProjeto.style.display = "none";
  });

  // ----- Função auxiliar para mostrar loading -----
  function mostrarLoading(botao, texto = "Salvando") {
    botao.disabled = true;
    botao.innerHTML = `${texto} <span class="spinner"></span>`;
  }

  function resetarBotao(botao, textoOriginal) {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }

  // ----- Salvar Cliente -----
  document.getElementById("salvar-cliente-btn").addEventListener("click", async (e) => {
    const botao = e.target;
    mostrarLoading(botao);

    const nome = document.getElementById("cliente-nome").value.trim();
    const email = document.getElementById("cliente-email").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const servico = document.getElementById("cliente-servico").value.trim();

    if(!nome || !email) {
      alert("Preencha nome e email");
      resetarBotao(botao, "Salvar Cliente");
      return;
    }

    if(editarClienteAtual){
      const id = editarClienteAtual.dataset.id;
      await updateDoc(doc(db, "clientes", id), { nome, email, telefone, servico });
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
    resetarBotao(botao, "Salvar Cliente");
  });

  // ----- Salvar Projeto -----
  document.getElementById("salvar-projeto-btn").addEventListener("click", async (e) => {
    const botao = e.target;
    mostrarLoading(botao);

    const nome = document.getElementById("projeto-nome").value.trim();
    const clienteId = selectProjetoCliente.value;

    if (!nome) {
      alert("Digite o nome do projeto");
      resetarBotao(botao, "Salvar Projeto");
      return;
    }
    if (!clienteId) {
      alert("Selecione um cliente válido");
      resetarBotao(botao, "Salvar Projeto");
      return;
    }

    const clienteNome = selectProjetoCliente.options[selectProjetoCliente.selectedIndex].text;

    if (editarProjetoAtual) {
      const id = editarProjetoAtual.dataset.id;
      await updateDoc(doc(db, "projetos", id), { nome, cliente: clienteId, clienteNome });
      editarProjetoAtual = null;
    } else {
      await addDoc(collection(db, "projetos"), { nome, cliente: clienteId, clienteNome });
    }

    await carregarProjetos();

    document.getElementById("projeto-nome").value = "";
    selectProjetoCliente.value = "";

    modalProjeto.style.display = "none";
    resetarBotao(botao, "Salvar Projeto");
  });

  // ----- Logout -----
  const logoutBtn = document.getElementById("logout-btn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => window.location.href = "index.html")
        .catch(err => alert("Erro ao sair: " + err.message));
    });
  }

 


});


adicionarBtn.addEventListener('click', (e) => {
  e.preventDefault();

  const titulo = tituloInput.value.trim();
  const data = dataInput.value.trim();
  const hora = horaInput.value.trim();

  if (!titulo || !data || !hora) {
    alert('Preencha todos os campos');
    return;
  }

  const partes = data.split('-');
  const dataBR = `${partes[2]}/${partes[1]}/${partes[0]}`;

  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>${dataBR} ${hora}</td>
    <td>${titulo}</td>
    <td><button class="remover-evento">X</button></td>
  `;

  tr.querySelector('.remover-evento').addEventListener('click', () => tr.remove());

  agendaList.appendChild(tr);

  tituloInput.value = '';
  dataInput.value = '';
  horaInput.value = '';
});
