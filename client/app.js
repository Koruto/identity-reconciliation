(function () {
  const API_BASE = "http://localhost:3000";
  const responseEl = document.getElementById("response");
  const btnHealth = document.getElementById("btn-health");
  const btnIdentify = document.getElementById("btn-identify");
  const inputEmail = document.getElementById("input-email");
  const inputPhone = document.getElementById("input-phone");
  const apiBaseEl = document.getElementById("api-base");

  apiBaseEl.textContent = API_BASE;

  function showResponse(text, isError) {
    responseEl.textContent = text;
    responseEl.classList.toggle("error", !!isError);
    responseEl.classList.remove("loading");
  }

  function setLoading() {
    responseEl.textContent = "Loading…";
    responseEl.classList.add("loading");
    responseEl.classList.remove("error");
  }

  btnHealth.addEventListener("click", async function () {
    setLoading();
    btnHealth.disabled = true;
    try {
      const res = await fetch(API_BASE + "/health");
      const data = await res.json().catch(() => ({}));
      showResponse(JSON.stringify(data, null, 2), !res.ok);
    } catch (err) {
      showResponse("Error: " + err.message, true);
    } finally {
      btnHealth.disabled = false;
    }
  });

  btnIdentify.addEventListener("click", async function () {
    setLoading();
    btnIdentify.disabled = true;
    const email = inputEmail.value.trim() || undefined;
    const phone = inputPhone.value.trim() || undefined;
    if (!email && !phone) {
      showResponse("Provide at least email or phone.", true);
      btnIdentify.disabled = false;
      return;
    }
    try {
      const body = {};
      if (email) body.email = email;
      if (phone) body.phoneNumber = phone;
      const res = await fetch(API_BASE + "/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      showResponse(JSON.stringify(data, null, 2), !res.ok);
    } catch (err) {
      showResponse("Error: " + err.message, true);
    } finally {
      btnIdentify.disabled = false;
    }
  });
})();
