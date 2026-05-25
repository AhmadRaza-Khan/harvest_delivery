(function () {
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast toast-top toast-end";
    document.body.appendChild(container);
  }
})();

/**
 * @param {string} message 
 * @param {"success"|"error"|"warning"|"info"} [type="success"]
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.classList.add("alert");

  switch (type) {
    case "success":
      toast.classList.add("alert-success");
      break;
    case "error":
      toast.classList.add("alert-error");
      break;
    case "warning":
      toast.classList.add("alert-warning");
      break;
    default:
      toast.classList.add("alert-info");
  }

  const span = document.createElement("span");
  span.innerText = message;
  toast.appendChild(span);

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}


if (typeof module !== "undefined") {
  module.exports = { showToast };
}
