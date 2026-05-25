
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const btn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      btn.innerText = "";
      btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span>`;
      const response = await fetch("/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.value.trim(),
          password: passwordInput.value.trim(),
        }),
      });

      const data = await response.text();

      if (!response.ok) {
        const err = await response.json();
        showToast("Login failed: " + (err.message || "Unknown error"), "error");
        return;
      }
      showToast("Login successful!");
      window.location.href = "/"
    } catch (err) {
      showToast("Invalid Credentials!", "error")
    } finally {
      btn.innerText = "Submit";
    }
  });
});
