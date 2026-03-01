// ===== FIX: DEFINE ALL DOM ELEMENTS =====
const registerBox = document.getElementById("registerBox");
const home = document.getElementById("home");
const encryptInput = document.getElementById("encryptInput");
const decryptInput = document.getElementById("decryptInput");
const passwordPopup = document.getElementById("passwordPopup");
const filePassword = document.getElementById("filePassword");
const popupTitle = document.getElementById("popupTitle");

let selectedFile, mode;

/* ---------- AUTH ---------- */
async function login() {
  const res = await fetch("/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      username: loginUser.value,
      password: loginPass.value
    })
  });

  if (res.ok) showHome();
  else alert("Invalid credentials");
}

async function register() {
  const res = await fetch("/register", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      username: regUser.value,
      password: regPass.value,
      email: regEmail.value,
      phone: regPhone.value
    })
  });

  if (res.ok) showHome();
  else alert("Registration failed");
}

/* ---------- OTP ---------- */
async function forgotPassword() {
  const email = prompt("Enter registered email");
  if (!email) return;

  await fetch("/forgot-password", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ email })
  });

  const otp = prompt("Enter OTP");
  const newPass = prompt("Enter new password");

  await fetch("/reset-password", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ email, otp, newPass })
  });

  alert("Password reset successful");
}

/* ---------- UI ---------- */
function showRegister(){
  document.querySelector(".auth-container").style.display="none";
  registerBox.style.display="flex";
}

function showLogin(){
  registerBox.style.display="none";
  document.querySelector(".auth-container").style.display="flex";
}

function showHome(){
  const auth = document.querySelector(".auth-container");
  auth.classList.add("fade-out");

  setTimeout(() => {
    auth.style.display = "none";
    home.style.display = "flex";
    home.classList.add("fade-in");
  }, 500);
}

/* ---------- ENCRYPTION ---------- */
function encryptFile(){
  mode="encrypt";
  filePassword.value = "";
  popupTitle.innerText = "Enter Password for Encryption";
  passwordPopup.style.display="flex";
  encryptInput.click();
}

function decryptFile(){
  mode="decrypt";
  filePassword.value = "";
  popupTitle.innerText = "Enter Password for Decryption";
  passwordPopup.style.display="flex";
  decryptInput.click();
}

encryptInput.onchange = e => selectedFile = e.target.files[0];
decryptInput.onchange = e => selectedFile = e.target.files[0];

async function confirmCrypto(){
  const password = filePassword.value;
  const data = await selectedFile.arrayBuffer();

  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt","decrypt"]
  );

  let result;

  if (mode === "encrypt") {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, aesKey, data
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt,0);
    combined.set(iv,salt.length);
    combined.set(new Uint8Array(encrypted), salt.length+iv.length);
    result = combined;

  } else {
    const salt = new Uint8Array(data.slice(0,16));
    const iv = new Uint8Array(data.slice(16,28));
    const encryptedData = data.slice(28);

    try {
      result = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv }, aesKey, encryptedData
      );
    } catch {
      alert("Wrong password");
      return;
    }
  }

  const blob = new Blob([result]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = mode === "encrypt"
    ? selectedFile.name + ".enc"
    : selectedFile.name.replace(".enc","");
  a.click();

  passwordPopup.style.display="none";
}

/* ---------- THEME ---------- */
function applyTheme(theme){
  document.body.classList.remove("black","white","green","blue");
  document.body.classList.add(theme);
  localStorage.setItem("theme", theme);
}

window.addEventListener("DOMContentLoaded", () => {
  applyTheme(localStorage.getItem("theme") || "black");
});