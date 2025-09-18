// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// ------------------ Páginas de login/registro ------------------
function currentPage() {
  const p = window.location.pathname.split("/").pop();
  return p === "" ? "index.html" : p;
}
const LOGIN_PAGES = ["index.html", "login.html", "register.html"];

// ------------------ onAuthStateChanged ------------------
onAuthStateChanged(auth, (user) => {
  const page = currentPage();
  console.log("[AUTH] onAuthStateChanged", { user: !!user, page });

  if (user) {
    // Redireciona para painel se estiver logado
    if (LOGIN_PAGES.includes(page)) {
      window.location.replace("painel.html");
    }
  } else {
    // Redireciona para login se tentar acessar painel
    if (!LOGIN_PAGES.includes(page)) {
      window.location.replace("index.html");
    }
  }
});

// ------------------ Alternar formulários ------------------
window.showRegister = () => {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
  clearErrors();
};

window.showLogin = () => {
  document.getElementById("register-form").style.display = "none";
  document.getElementById("login-form").style.display = "block";
  clearErrors();
};

// Limpa mensagens de erro
function clearErrors() {
  const errors = document.querySelectorAll(".error");
  errors.forEach(e => e.textContent = "");
}

// ------------------ Registro ------------------
window.register = async () => {
  const name = document.getElementById("register-name")?.value.trim();
  const email = document.getElementById("register-email")?.value.trim();
  const password = document.getElementById("register-password")?.value.trim();
  const errorMsg = document.getElementById("register-error");

  if (!name || !email || !password) {
    errorMsg.textContent = "Preencha todos os campos!";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.replace("painel.html"); // redirect será tratado pelo onAuthStateChanged
  } catch (err) {
    if (errorMsg) errorMsg.textContent = err.message;
    console.error("[AUTH] register error:", err);
  }
};

// ------------------ Login ------------------
window.login = async () => {
  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value.trim();
  const errorMsg = document.getElementById("login-error");

  if (!email || !password) {
    errorMsg.textContent = "Preencha todos os campos!";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("painel.html"); // redirect será tratado pelo onAuthStateChanged
  } catch (err) {
    if (errorMsg) errorMsg.textContent = err.message;
    console.error("[AUTH] login error:", err);
  }
};
