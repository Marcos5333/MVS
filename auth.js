// auth.js (corrigido)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// utilitário: pega nome do arquivo atual (ex: index.html, painel.html)
function currentPage() {
  const p = window.location.pathname.split("/").pop();
  return p === "" ? "index.html" : p;
}

// páginas de login/registro (ajuste se seus nomes forem diferentes)
const LOGIN_PAGES = ["index.html", "login.html", "register.html"];

// Debug: mostra evento auth no console
onAuthStateChanged(auth, (user) => {
  const page = currentPage();
  console.log("[AUTH] onAuthStateChanged", { user: !!user, page });

  if (user) {
    // se está logado e estiver numa página de login/registro, envia pro painel
    if (LOGIN_PAGES.includes(page)) {
      // use replace para não enfileirar histórico (evita voltar para login com "Voltar")
      window.location.replace("painel.html");
    }
    // se já estiver no painel, não faz nada (permite continuidade)
  } else {
    // se não está logado e está em uma página protegida (ex: painel.html), manda pro login
    if (!LOGIN_PAGES.includes(page)) {
      window.location.replace("index.html");
    }
  }
});

// Registro (chame window.register() do formulário)
window.register = async () => {
  const name = document.getElementById("register-name")?.value;
  const email = document.getElementById("register-email")?.value;
  const password = document.getElementById("register-password")?.value;
  const errorMsg = document.getElementById("register-error");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    // redirect será tratado pelo onAuthStateChanged, mas usamos replace por segurança
    window.location.replace("painel.html");
  } catch (err) {
    if (errorMsg) errorMsg.textContent = err.message;
    console.error("[AUTH] register error:", err);
  }
};

// Login (chame window.login() do formulário)
window.login = async () => {
  const email = document.getElementById("login-email")?.value;
  const password = document.getElementById("login-password")?.value;
  const errorMsg = document.getElementById("login-error");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // redirect será tratado pelo onAuthStateChanged; garantir replace
    window.location.replace("painel.html");
  } catch (err) {
    if (errorMsg) errorMsg.textContent = err.message;
    console.error("[AUTH] login error:", err);
  }
};
