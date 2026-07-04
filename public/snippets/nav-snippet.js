const currentBranch = new URLSearchParams(location.search).get("branch") || "The Pearl";

function branchLink(name, label) {
  const active = currentBranch === name;
  const activeClasses = active ? "bg-accent text-black" : "text-accent hover:bg-accent hover:text-black";
  return `
    <div class="flex items-center gap-1.5 border border-accent rounded-lg pl-2 pr-1.5 py-0.5">
      <a href="/?branch=${encodeURIComponent(name)}" class="text-xs lg:text-sm font-semibold rounded px-1 ${activeClasses}">${label}</a>
      <input
        type="checkbox"
        class="toggle toggle-xs toggle-warning branch-snooze-toggle"
        title="Snooze/unsnooze ${label} branch"
        data-branch="${name}"
        onchange="toggleBranchSnooze('${name}', this)"
      >
    </div>
  `;
}

async function toggleBranchSnooze(branch, checkbox) {
  checkbox.disabled = true;
  const snooze = checkbox.checked;
  const path = snooze ? '/snooze/snooze-branch' : '/snooze/unsnooze-branch';
  try {
    const res = await fetch(`${path}?branch=${encodeURIComponent(branch)}`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Request failed');
    showToast(snooze ? `${branch} snoozed` : `${branch} unsnoozed`, snooze ? 'warning' : 'success');
  } catch (e) {
    console.error(e);
    checkbox.checked = !snooze;
    showToast(`Failed to update ${branch} snooze status`, 'error');
  } finally {
    checkbox.disabled = false;
  }
}

const navbar = `
<div class="navbar-start flex items-center gap-2 lg:gap-4">
    <a href="/" class="text-accent font-bold text-sm md:text-md lg:text-lg xl:text-xl 2xl:text-2xl">Harvest</a>
    <div class="flex items-center gap-2">
      ${branchLink("The Pearl", "Pearl")}
      ${branchLink("West Walk", "West Walk")}
    </div>
  </div>
  <div id="search-bar" class="hidden navbar-center w-52 md:w-60 lg:w-96 xl:w-96 2xl:w-1/3 relative">
    <input id="searchBar" type="text" placeholder="Search categories and subcategories here!" class="input text-accent input-accent w-full" autocomplete="off" />
    <ul id="suggestions"></ul>
  </div>
  <div id="logout-container" class="navbar-end flex items-center gap-2">
    <a href="/menu/page" class="btn text-xs btn-xs lg:btn-sm btn-ghost text-accent border border-accent hover:bg-accent hover:text-black">Manage</a>
    <button id="btn-logout" class="btn text-xs btn-xs lg:btn-sm text-accent bg-base-300 border border-accent hover:bg-accent hover:border-black hover:border-2 hover:text-black">Logout</button>
  </div>
`;

const wrapper = document.createElement("div");
wrapper.classList.add("navbar", "shadow-sm", "bg-base-300", "text-primary-content");
wrapper.innerHTML = navbar;
document.body.prepend(wrapper);

(async () => {
  try {
    const res = await fetch('/snooze/branches', { credentials: 'include' });
    const branches = await res.json();
    branches.forEach((b) => {
      const input = wrapper.querySelector(`.branch-snooze-toggle[data-branch="${CSS.escape(b.name)}"]`);
      if (input) input.checked = b.isSnoozed;
    });
  } catch (e) {
    console.error('Failed to load branch snooze status', e);
  }
})();