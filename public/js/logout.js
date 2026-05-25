const btn = document.getElementById("btn-logout");
document.getElementById("btn-logout").addEventListener("click", async function () {
    try {
        btn.innerHTML = "";
        btn.innerHTML = `<span class="loading loading-spinner loading-sm"></span>`
        let res = await fetch("/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        })
        res = await res.json();
        console.log(res)
        if(res.success){
            showToast(res.message, "success")
            window.location.href = "/auth/signin"
        }
    } catch (error) {
        console.log(error)
        showToast("Failed to logout", "error")
    } finally {
    btn.innerHTML = "Logout";
    btn.innerHTML = ``;
    }
})