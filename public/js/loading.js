function setLoading(loading, container) {
  const oldSkeleton = container.querySelector(".loading-skeleton");
  if (oldSkeleton) oldSkeleton.remove();

  if (loading) {
    const skeletonContainer = document.createElement("div");
    skeletonContainer.className = "loading-skeleton";
    skeletonContainer.innerHTML = `
<div class="flex w-full flex-col gap-4 p-4 md:p-6 lg:p-10">
  <div class="skeleton h-32 w-full"></div>
  <div class="skeleton h-4 w-28"></div>
  <div class="skeleton h-4 w-full"></div>
  <div class="skeleton h-4 w-full"></div>
</div>
    `;
    container.appendChild(skeletonContainer);
  }
}