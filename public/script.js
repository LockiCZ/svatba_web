const form = document.getElementById("rsvp-form");
const message = document.getElementById("form-message");
const ucastDetail = document.getElementById("ucast-detail");

function aktualizovatViditelnost() {
  const prijezd = form.querySelector('input[name="prijezd"]:checked')?.value;
  const nedorazi = prijezd === "nemuzu";
  ucastDetail.classList.toggle("is-hidden", nedorazi);
}

form.querySelectorAll('input[name="prijezd"]').forEach((radio) => {
  radio.addEventListener("change", aktualizovatViditelnost);
});
aktualizovatViditelnost();

function nastavZpravu(text, typ) {
  message.textContent = text;
  message.className = "form-message" + (typ ? " " + typ : "");
  if (text) zobrazToast(text, typ);
}

function zobrazToast(text, typ) {
  const old = document.getElementById("toast-popup");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.id = "toast-popup";
  toast.className = "toast" + (typ ? " toast-" + typ : "");
  toast.textContent = text;

  const close = document.createElement("button");
  close.className = "toast-close";
  close.textContent = "×";
  close.onclick = () => toast.remove();
  toast.appendChild(close);

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));

}

document.querySelectorAll(".stepper-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const delta = Number(btn.dataset.delta);
    const min = Number(input.min ?? 0);
    const max = Number(input.max ?? 99);
    input.value = Math.min(max, Math.max(min, Number(input.value) + delta));
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  nastavZpravu("", "");

  const jmena = form.jmena.value.trim();
  if (!jmena) {
    nastavZpravu("Vyplňte prosím křestní jména.", "error");
    form.jmena.focus();
    return;
  }

  const prijezd = form.querySelector('input[name="prijezd"]:checked').value;

  let pocetOsob = null;
  try {
    const names = jmena.split(",").map((s) => s.trim()).filter(Boolean);
    if (names.length > 0) pocetOsob = names.length;
  } catch {
    pocetOsob = null;
  }

  const data = {
    jmena,
    pocetOsob,
    prijezd,
    pocetMaso: Number(form.pocetMaso.value) || 0,
    pocetVege: Number(form.pocetVege.value) || 0,
    alergie: form.alergie.value.trim(),
    odjezd: form.querySelector('input[name="odjezd"]:checked')?.value || "",
    vybaveni: form.vybaveni.checked,
    postel: form.postel.checked,
    doprava: form.querySelector('input[name="doprava"]:checked').value,
    poznamka: form.poznamka.value.trim(),
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Odesílám…";

  try {
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const vysledek = await res.json();

    if (res.ok && vysledek.ok) {
      zobrazModal();
      form.reset();
      aktualizovatViditelnost();
    } else {
      nastavZpravu(
        vysledek.chyba || "Něco se pokazilo, zkuste to prosím znovu.",
        "error"
      );
    }
  } catch (err) {
    console.error("RSVP chyba:", err);
    nastavZpravu(
      "Nepodařilo se spojit se serverem. Zkontrolujte připojení.",
      "error"
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Odeslat dotazník";
  }
});

function zobrazModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const box = document.createElement("div");
  box.className = "modal-box";
  box.innerHTML = `
    <p class="modal-icon">❤️</p>
    <h2 class="modal-title">Děkujeme za odeslání!</h2>
    <p class="modal-text">Vaše odpověď byla úspěšně přijata. Těšíme se na vás!</p>
    <button class="modal-ok">OK</button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("modal-show"));

  box.querySelector(".modal-ok").addEventListener("click", () => {
    overlay.classList.remove("modal-show");
    setTimeout(() => overlay.remove(), 300);
  });
}
