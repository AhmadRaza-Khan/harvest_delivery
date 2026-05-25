const navbar = `
<div class="navbar-start">
    <a href="/" class="text-accent font-bold text-sm md:text-md lg:text-lg xl:text-xl 2xl:text-2xl">Baristro</a>
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