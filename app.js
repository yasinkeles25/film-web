const API_URL = "https://film-api-ru0v.onrender.com/filmler";

let tumFilmler = [];
let aktifFilm = null;
let charts = {};

// Sunucu uyanana kadar tekrar tekrar deneyen akıllı yükleme fonksiyonu
async function verileriYukle(denemeSayisi = 1) {
    const galeri = document.getElementById("film-galerisi");
    const sayac = document.getElementById("liste-sayac");

    // İlk açılışta kullanıcıya şık bir bilgilendirme göster
    if (denemeSayisi === 1) {
        galeri.innerHTML = `
            <div class="col-span-full py-16 text-center">
                <div class="inline-block animate-spin text-4xl mb-4">🦉</div>
                <h3 class="text-lg font-bold text-white">Film Baykuşu Uyanıyor...</h3>
                <p class="text-xs text-gray-400 mt-2 max-w-sm mx-auto">Ücretsiz bulut sunucusu uyku modundan çıkıyor. İlk açılış 30-40 saniye sürebilir, lütfen bekleyin.</p>
            </div>
        `;
        sayac.innerText = "Yükleniyor...";
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye bekle

        const res = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("Sunucu yanıt vermedi");

        tumFilmler = await res.json();
        dropdownlariDoldur();
        filtrele();
    } catch (e) {
        console.warn(`Bağlantı denemesi ${denemeSayisi} başarısız oldu, sunucu uyanıyor olabilir...`);
        sayac.innerText = `Sunucu bekleniyor (${denemeSayisi})...`;
        
        // 3 saniye sonra tekrar dene (maksimum 15 deneme / ~45 saniye)
        if (denemeSayisi < 15) {
            setTimeout(() => verileriYukle(denemeSayisi + 1), 3000);
        } else {
            galeri.innerHTML = `
                <div class="col-span-full py-12 text-center text-red-400">
                    <p class="font-bold">⚠️ Bağlantı zaman aşımına uğradı.</p>
                    <button onclick="verileriYukle(1)" class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Tekrar Dene</button>
                </div>
            `;
        }
    }
}

function dropdownlariDoldur() {
    const turlerSet = new Set();
    const yillarSet = new Set();

    tumFilmler.forEach(f => {
        if (Array.isArray(f.turler)) {
            f.turler.forEach(t => {
                t.split(/[,/&]/).forEach(p => {
                    const temiz = p.trim();
                    if (temiz) turlerSet.add(temiz.charAt(0).toUpperCase() + temiz.slice(1).toLowerCase());
                });
            });
        }
        if (f.yil && f.yil.trim()) {
            yillarSet.add(f.yil.trim());
        }
    });

    const turSelect = document.getElementById("tur-filtre");
    turSelect.innerHTML = '<option value="Tümü">🎭 Tüm Türler</option>';
    Array.from(turlerSet).sort().forEach(tur => {
        turSelect.innerHTML += `<option value="${tur}">${tur}</option>`;
    });

    const yilSelect = document.getElementById("yil-filtre");
    yilSelect.innerHTML = '<option value="Tümü">📅 Tüm Yıllar</option>';
    Array.from(yillarSet).sort((a, b) => b - a).forEach(yil => {
        yilSelect.innerHTML += `<option value="${yil}">${yil}</option>`;
    });
}

function filtrele() {
    const arama = document.getElementById("arama-input").value.toLowerCase();
    const secilenTur = document.getElementById("tur-filtre").value;
    const secilenYil = document.getElementById("yil-filtre").value;
    const minPuan = parseFloat(document.getElementById("puan-filtre").value);

    const filtrelenmis = tumFilmler.filter(film => {
        const adiUyar = film.adi.toLowerCase().includes(arama);
        const puanUyar = (film.puan || 0) >= minPuan;
        const yilUyar = (secilenYil === "Tümü") || (film.yil && film.yil.toString() === secilenYil);
        
        let turUyar = true;
        if (secilenTur !== "Tümü") {
            turUyar = Array.isArray(film.turler) && film.turler.some(t => t.toLowerCase().includes(secilenTur.toLowerCase()));
        }
        return adiUyar && puanUyar && turUyar && yilUyar;
    });

    galeriRender(filtrelenmis);
}

function galeriRender(filmler) {
    const galeri = document.getElementById("film-galerisi");
    document.getElementById("liste-sayac").innerText = `${filmler.length} film listelendi`;
    galeri.innerHTML = "";

    if (filmler.length === 0) {
        galeri.innerHTML = `<div class="col-span-full py-12 text-center text-gray-500">Aradığınız kriterlere uygun film bulunamadı.</div>`;
        return;
    }

    filmler.forEach(film => {
        const afis = (film.afis_yolu && film.afis_yolu.startsWith("http")) 
            ? film.afis_yolu 
            : "https://via.placeholder.com/300x450/1f2937/9ca3af?text=Afis+Yok";

        const kart = document.createElement("div");
        kart.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-red-500/50 hover:scale-105 transition cursor-pointer flex flex-col justify-between";
        kart.onclick = () => filmDetayAc(film.id);
        kart.innerHTML = `
            <img src="${afis}" alt="${film.adi}" class="w-full h-72 object-cover" onerror="this.src='https://via.placeholder.com/300x450/1f2937/9ca3af?text=Afis+Yok';">
            <div class="p-3">
                <h4 class="font-bold text-sm truncate text-gray-100">${film.adi}</h4>
                <div class="flex justify-between items-center text-xs text-gray-400 mt-1">
                    <span>📅 ${film.yil || '?'}</span>
                    <span class="text-yellow-400 font-semibold">⭐ ${film.puan || '0.0'}</span>
                </div>
            </div>
        `;
        galeri.appendChild(kart);
    });
}

async function filmDetayAc(id) {
    const res = await fetch(`${API_URL}/${id}`);
    aktifFilm = await res.json();
    detayGorunumuRender();
    document.getElementById("film-modal").classList.remove("hidden");
}

function detayGorunumuRender() {
    const container = document.getElementById("modal-icerik");
    document.getElementById("modal-baslik").innerText = aktifFilm.adi;
    const afis = (aktifFilm.afis_yolu && aktifFilm.afis_yolu.startsWith("http")) 
        ? aktifFilm.afis_yolu 
        : "https://via.placeholder.com/300x450/1f2937/9ca3af?text=Afis+Yok";

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-6">
            <img src="${afis}" class="w-full sm:w-48 h-64 object-cover rounded-lg border border-gray-800">
            <div class="space-y-2 flex-1">
                <div class="flex gap-3 text-sm text-gray-300 font-medium">
                    <span>📅 ${aktifFilm.yil || '?'}</span>
                    <span>⏱️ ${aktifFilm.sure || 0} dk</span>
                    <span class="text-yellow-400">⭐ ${aktifFilm.puan || 0}/10</span>
                </div>
                <p class="text-xs text-gray-400"><strong>Türler:</strong> ${(aktifFilm.turler || []).join(", ") || 'Belirtilmemiş'}</p>
                <p class="text-xs text-gray-400"><strong>Ülkeler:</strong> ${(aktifFilm.ulkeler || []).join(", ") || 'Belirtilmemiş'}</p>
                <p class="text-xs ${aktifFilm.izlendi ? 'text-green-400' : 'text-red-400'} font-semibold">
                    ${aktifFilm.izlendi ? `✅ İzlendi (${aktifFilm.izlenme_tarihi || ''})` : '❌ İzlenmedi'}
                </p>
                <div class="mt-2">
                    <h5 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Özet</h5>
                    <p class="text-sm text-gray-300 mt-1 leading-relaxed">${aktifFilm.ozet || 'Özet bulunmuyor.'}</p>
                </div>
            </div>
        </div>
        <div class="border-t border-gray-800 pt-4 flex justify-end gap-3">
            <button onclick="duzenleGorunumuRender()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">✏️ Düzenle</button>
            <button onclick="filmSil(${aktifFilm.id})" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition">🗑️ Sil</button>
        </div>
    `;
}

function duzenleGorunumuRender() {
    const container = document.getElementById("modal-icerik");
    document.getElementById("modal-baslik").innerText = `Düzenle: ${aktifFilm.adi}`;
    container.innerHTML = `
        <form onsubmit="filmGuncelle(event)" class="space-y-3">
            <div>
                <label class="block text-xs text-gray-400">Film Adı</label>
                <input type="text" id="d-adi" value="${aktifFilm.adi}" required class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label class="block text-xs text-gray-400">Yıl</label>
                    <input type="text" id="d-yil" value="${aktifFilm.yil || ''}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">
                </div>
                <div>
                    <label class="block text-xs text-gray-400">Puan</label>
                    <input type="number" step="0.1" id="d-puan" value="${aktifFilm.puan || 0}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">
                </div>
                <div>
                    <label class="block text-xs text-gray-400">Süre (Dk)</label>
                    <input type="number" id="d-sure" value="${aktifFilm.sure || 0}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">
                </div>
            </div>
            <div>
                <label class="block text-xs text-gray-400">Türler (Virgülle ayırın)</label>
                <input type="text" id="d-turler" value="${(aktifFilm.turler || []).join(', ')}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">
            </div>
            <div>
                <label class="block text-xs text-gray-400">Ülkeler (Virgülle ayırın)</label>
                <input type="text" id="d-ulkeler" value="${(aktifFilm.ulkeler || []).join(', ')}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">
            </div>
            <div>
                <label class="block text-xs text-gray-400">Afiş URL</label>
                <input type="text" id="d-afis" value="${aktifFilm.afis_yolu || ''}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">
            </div>
            <div>
                <label class="block text-xs text-gray-400">Özet</label>
                <textarea id="d-ozet" rows="3" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">${aktifFilm.ozet || ''}</textarea>
            </div>
            <div class="flex items-center gap-4">
                <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" id="d-izlendi" ${aktifFilm.izlendi ? 'checked' : ''}> İzlendi
                </label>
                <input type="text" id="d-tarih" value="${aktifFilm.izlenme_tarihi || ''}" placeholder="Tarih" class="bg-gray-950 border border-gray-800 rounded p-1.5 text-sm">
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="detayGorunumuRender()" class="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm">İptal</button>
                <button type="submit" class="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm">Kaydet</button>
            </div>
        </form>
    `;
}

async function filmGuncelle(e) {
    e.preventDefault();
    const guncelVeri = {
        adi: document.getElementById("d-adi").value.trim(),
        yil: document.getElementById("d-yil").value.trim(),
        puan: parseFloat(document.getElementById("d-puan").value) || 0.0,
        sure: parseInt(document.getElementById("d-sure").value) || 0,
        turler: document.getElementById("d-turler").value.split(",").map(t => t.trim()).filter(Boolean),
        ulkeler: document.getElementById("d-ulkeler").value.split(",").map(u => u.trim()).filter(Boolean),
        afis_yolu: document.getElementById("d-afis").value.trim(),
        ozet: document.getElementById("d-ozet").value.trim(),
        izlendi: document.getElementById("d-izlendi").checked,
        izlenme_tarihi: document.getElementById("d-tarih").value.trim()
    };

    await fetch(`${API_URL}/${aktifFilm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guncelVeri)
    });

    modalKapat();
    verileriYukle();
}

async function filmSil(id) {
    if (confirm("Bu filmi silmek istediğinize emin misiniz?")) {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        modalKapat();
        verileriYukle();
    }
}

async function filmEkle(e) {
    e.preventDefault();
    const yeniVeri = {
        adi: document.getElementById("ekle-adi").value.trim(),
        yil: document.getElementById("ekle-yil").value.trim(),
        puan: parseFloat(document.getElementById("ekle-puan").value) || 0.0,
        sure: parseInt(document.getElementById("ekle-sure").value) || 0,
        turler: document.getElementById("ekle-turler").value.split(",").map(t => t.trim()).filter(Boolean),
        ulkeler: document.getElementById("ekle-ulkeler").value.split(",").map(u => u.trim()).filter(Boolean),
        afis_yolu: document.getElementById("ekle-afis").value.trim(),
        ozet: document.getElementById("ekle-ozet").value.trim(),
        izlendi: document.getElementById("ekle-izlendi").checked,
        izlenme_tarihi: document.getElementById("ekle-tarih").value.trim()
    };

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(yeniVeri)
    });

    e.target.reset();
    sayfaDegistir('galeri');
    verileriYukle();
}

function modalKapat() {
    document.getElementById("film-modal").classList.add("hidden");
    aktifFilm = null;
}

function sayfaDegistir(sayfa) {
    document.getElementById("sec-galeri").classList.toggle("hidden", sayfa !== "galeri");
    document.getElementById("sec-ekle").classList.toggle("hidden", sayfa !== "ekle");
    document.getElementById("sec-analiz").classList.toggle("hidden", sayfa !== "analiz");

    ["galeri", "ekle", "analiz"].forEach(s => {
        const btn = document.getElementById(`nav-${s}`);
        if (s === sayfa) {
            btn.className = "px-4 py-2 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 transition";
        } else {
            btn.className = "px-4 py-2 rounded-lg bg-gray-900 text-gray-400 font-medium hover:bg-gray-800 transition";
        }
    });

    if (sayfa === "analiz") analizCiz();
}

function analizCiz() {
    document.getElementById("stat-toplam").innerText = tumFilmler.length;
    const ortPuan = tumFilmler.reduce((a, b) => a + (b.puan || 0), 0) / (tumFilmler.length || 1);
    document.getElementById("stat-ortalama").innerText = ortPuan.toFixed(2);

    const izlenenDk = tumFilmler.filter(f => f.izlendi).reduce((a, b) => a + (b.sure || 0), 0);
    const saat = izlenenDk / 60;
    const gun = saat / 24;
    document.getElementById("stat-sure").innerText = `${Math.floor(saat)} Saat`;
    document.getElementById("stat-gun").innerText = `${gun.toFixed(1)} Gün`;

    Object.values(charts).forEach(c => c.destroy());

    // 1. Top 10 Film
    const top10 = [...tumFilmler].sort((a, b) => b.puan - a.puan).slice(0, 10);
    charts.top10 = new Chart(document.getElementById("chart-top10"), {
        type: 'bar',
        data: {
            labels: top10.map(f => f.adi),
            datasets: [{ label: 'IMDb Puanı', data: top10.map(f => f.puan), backgroundColor: '#ef4444' }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
    });

    // 2. Onyıllar
    const onyilSayim = {};
    tumFilmler.forEach(f => {
        const y = parseInt(f.yil);
        if (!isNaN(y)) {
            const onyil = `${Math.floor(y / 10) * 10}'ler`;
            onyilSayim[onyil] = (onyilSayim[onyil] || 0) + 1;
        }
    });
    charts.onyil = new Chart(document.getElementById("chart-onyil"), {
        type: 'bar',
        data: {
            labels: Object.keys(onyilSayim).sort(),
            datasets: [{ label: 'Film Sayısı', data: Object.keys(onyilSayim).sort().map(k => onyilSayim[k]), backgroundColor: '#3b82f6' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // 3. Popüler Türler
    const turSayim = {};
    tumFilmler.forEach(f => {
        if (Array.isArray(f.turler)) {
            f.turler.forEach(t => {
                t.split(/[,/&]/).forEach(p => {
                    const temiz = p.trim();
                    if (temiz) {
                        const formatli = temiz.charAt(0).toUpperCase() + temiz.slice(1).toLowerCase();
                        turSayim[formatli] = (turSayim[formatli] || 0) + 1;
                    }
                });
            });
        }
    });
    const siraliTurler = Object.entries(turSayim).sort((a, b) => b[1] - a[1]).slice(0, 7);
    charts.turler = new Chart(document.getElementById("chart-turler"), {
        type: 'doughnut',
        data: {
            labels: siraliTurler.map(t => t[0]),
            datasets: [{ data: siraliTurler.map(t => t[1]), backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'] }]
        },
        options: { responsive: true }
    });

    // 4. Puan Dağılımı
    const puanAraliklari = { '1-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
    tumFilmler.forEach(f => {
        const p = f.puan || 0;
        if (p < 5) puanAraliklari['1-4']++;
        else if (p < 7) puanAraliklari['5-6']++;
        else if (p < 9) puanAraliklari['7-8']++;
        else puanAraliklari['9-10']++;
    });
    charts.puan = new Chart(document.getElementById("chart-puan"), {
        type: 'pie',
        data: {
            labels: Object.keys(puanAraliklari),
            datasets: [{ data: Object.values(puanAraliklari), backgroundColor: ['#64748b', '#3b82f6', '#22c55e', '#eab308'] }]
        },
        options: { responsive: true }
    });
}

// Scroll Shrink Efekti
window.addEventListener("scroll", () => {
    const header = document.getElementById("ana-header");
    const logoImg = document.getElementById("logo-img");
    const logoBaslik = document.getElementById("logo-baslik");
    const logoSlogan = document.getElementById("logo-slogan");

    if (window.scrollY > 40) {
        header?.classList.remove("py-8");
        header?.classList.add("py-2.5", "shadow-xl");

        logoImg?.classList.remove("w-24", "h-24");
        logoImg?.classList.add("w-10", "h-10");

        logoBaslik?.classList.remove("text-3xl");
        logoBaslik?.classList.add("text-lg");

        logoSlogan?.classList.add("hidden");
    } else {
        header?.classList.remove("py-2.5", "shadow-xl");
        header?.classList.add("py-8");

        logoImg?.classList.remove("w-10", "h-10");
        logoImg?.classList.add("w-24", "h-24");

        logoBaslik?.classList.remove("text-lg");
        logoBaslik?.classList.add("text-3xl");

        logoSlogan?.classList.remove("hidden");
    }
});

// Sayfa açıldığında başlat
verileriYukle();
