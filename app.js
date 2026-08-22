// --- SCROLL SHRINK (Logo ve Header Küçülme Efekti) ---
window.addEventListener("scroll", () => {
    const header = document.getElementById("ana-header");
    const logoImg = document.getElementById("logo-img");
    const logoBaslik = document.getElementById("logo-baslik");
    const logoSlogan = document.getElementById("logo-slogan");

    if (window.scrollY > 40) {
        // Aşağı kaydırıldığında: Kompakt Başlık
        header.classList.remove("py-8");
        header.classList.add("py-2.5", "shadow-xl");

        logoImg.classList.remove("w-24", "h-24");
        logoImg.classList.add("w-10", "h-10");

        logoBaslik.classList.remove("text-3xl");
        logoBaslik.classList.add("text-lg");

        logoSlogan.classList.add("hidden");
    } else {
        // En yukarıdayken: Büyük Karşılama Logosu
        header.classList.remove("py-2.5", "shadow-xl");
        header.classList.add("py-8");

        logoImg.classList.remove("w-10", "h-10");
        logoImg.classList.add("w-24", "h-24");

        logoBaslik.classList.remove("text-lg");
        logoBaslik.classList.add("text-3xl");

        logoSlogan.classList.remove("hidden");
    }
});
