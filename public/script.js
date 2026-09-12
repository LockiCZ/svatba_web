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
  if (text) message.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

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
      const dekujeme =
        prijezd === "nemuzu"
          ? "Děkujeme za odpověď. Budete nám chybět!"
          : "Děkujeme! Těšíme se na vás. ❤";
      nastavZpravu(dekujeme, "success");
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
