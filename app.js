const BASE_URL = "https://film-api-ru0v.onrender.com"; 
const API_URL = `${BASE_URL}/filmler`;

let tumFilmler = [];
let aktifFilm = null;
let charts = {};

// Google Harita Kütüphanesini Yükle
google.charts.load('current', {'packages':['geochart']});

async function verileriYukle(denemeSayisi = 1) {
    const galeri = document.getElementById("film-galerisi");
    const sayac = document.getElementById("liste-sayac");

    if (denemeSayisi === 1) {
        galeri.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <div class="inline-block animate-spin text-5xl mb-4">🦉</div>
                <h3 class="text-lg font-bold text-white">Film Baykuşu Uyanıyor...</h3>
                <p class="text-xs text-gray-400 mt-2 max-w-sm mx-auto">Sunucu uyku modundan çıkıyor. Lütfen 30 saniye kadar bekleyin.</p>
            </div>
        `;
        sayac.innerText = "Yükleniyor...";
    }

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Sunucu yanıt vermedi");

        tumFilmler = await res.json();
        dropdownlariDoldur();
        filtrele();
    } catch (e) {
        sayac.innerText = `Sunucu bekleniyor (${denemeSayisi})...`;
        if (denemeSayisi < 15) {
            setTimeout(() => verileriYukle(denemeSayisi + 1), 3000);
        } else {
            galeri.innerHTML = `<div class="col-span-full py-12 text-center text-red-400">⚠️ Bağlantı zaman aşımına uğradı.</div>`;
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
        kart.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-teal-500/50 hover:scale-105 transition cursor-pointer flex flex-col justify-between";
        kart.onclick = () => filmDetayAc(film.id);
        kart.innerHTML = `
            <img src="${afis}" alt="${film.adi}" class="w-full h-72 object-cover" onerror="this.src='https://via.placeholder.com/300x450/1f2937/9ca3af?text=Afis+Yok';">
            <div class="p-3">
                <h4 class="font-bold text-sm truncate text-gray-100">${film.adi}</h4>
                <div class="flex justify-between items-center text-xs text-gray-400 mt-1">
                    <span>📅 ${film.yil || '?'}</span>
                    <span class="text-teal-400 font-semibold">⭐ ${film.puan || '0.0'}</span>
                </div>
            </div>
        `;
        galeri.appendChild(kart);
    });
}

// O Günün Tarihini Formatlı Getiren Fonksiyon
function bugununTarihi() {
    return new Date().toISOString().split('T')[0];
}

// YENİ: TMDB'den Otomatik Veri Çekme
async function tmdbVeriCek() {
    const arama = document.getElementById("tmdb-arama").value.trim();
    if (!arama) return alert("Lütfen önce bir film adı yazın!");

    const buton = document.querySelector("button[onclick='tmdbVeriCek()']");
    const orjinalMetin = buton.innerText;
    buton.innerText = "⏳ Bulunuyor...";
    buton.disabled = true;

    try {
        const res = await fetch(`${BASE_URL}/tmdb/ara?film_adi=${encodeURIComponent(arama)}`);
        const data = await res.json();

        if (data.hata) {
            alert(data.hata);
        } else {
            // Formu TMDB verileri ile doldur
            document.getElementById("ekle-adi").value = data.adi || "";
            document.getElementById("ekle-yil").value = data.yil || "";
            document.getElementById("ekle-puan").value = data.puan || 0;
            document.getElementById("ekle-sure").value = data.sure || 0;
            document.getElementById("ekle-ozet").value = data.ozet || "";
            document.getElementById("ekle-afis").value = data.afis_yolu || "";
            if (data.turler) document.getElementById("ekle-turler").value = data.turler.join(", ");
        }
    } catch (e) {
        alert("Bağlantı hatası yaşandı.");
    } finally {
        buton.innerText = orjinalMetin;
        buton.disabled = false;
    }
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
                    <span class="text-teal-400">⭐ ${aktifFilm.puan || 0}/10</span>
                </div>
                <p class="text-xs text-gray-400"><strong>Türler:</strong> ${(aktifFilm.turler || []).join(", ") || 'Belirtilmemiş'}</p>
                <p class="text-xs text-gray-400"><strong>Ülkeler:</strong> ${(aktifFilm.ulkeler || []).join(", ") || 'Belirtilmemiş'}</p>
                <p class="text-xs text-teal-400 font-semibold">
                    ✅ İzlendi (${aktifFilm.izlenme_tarihi || 'Tarih Yok'})
                </p>
                <div class="mt-2">
                    <h5 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Özet</h5>
                    <p class="text-sm text-gray-300 mt-1 leading-relaxed">${aktifFilm.ozet || 'Özet bulunmuyor.'}</p>
                </div>
            </div>
        </div>
        <div class="border-t border-gray-800 pt-4 flex justify-end gap-3 mt-4">
            <button onclick="duzenleGorunumuRender()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition">✏️ Düzenle</button>
            <button onclick="filmSil(${aktifFilm.id})" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition">🗑️ Sil</button>
        </div>
    `;
}

function duzenleGorunumuRender() {
    const container = document.getElementById("modal-icerik");
    document.getElementById("modal-baslik").innerText = `Düzenle: ${aktifFilm.adi}`;
    
    // Düzenleme ekranında da boşsa bugünün tarihini atayalım
    const defaultTarih = aktifFilm.izlenme_tarihi ? aktifFilm.izlenme_tarihi : bugununTarihi();

    container.innerHTML = `
        <form onsubmit="filmGuncelle(event)" class="space-y-3">
            <div>
                <label class="block text-xs text-gray-400">Film Adı</label>
                <input type="text" id="d-adi" value="${aktifFilm.adi}" required class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm focus:border-teal-500">
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
            <div>
                <label class="block text-xs text-gray-400 mb-1">İzlenme Tarihi</label>
                <input type="date" id="d-tarih" value="${defaultTarih}" class="bg-gray-950 border border-gray-800 rounded p-2 text-sm w-full focus:border-teal-500">
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="detayGorunumuRender()" class="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700">İptal</button>
                <button type="submit" class="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm transition">Kaydet</button>
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
        izlendi: true, 
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
        izlendi: true, // Her zaman true
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

    // Yeni Film Ekle sekmesi açıldığında tarihi bugünün tarihi yap
    if (sayfa === "ekle") {
        document.getElementById("ekle-tarih").value = bugununTarihi();
    }

    ["galeri", "ekle", "analiz"].forEach(s => {
        const btn = document.getElementById(`nav-${s}`);
        if (s === sayfa) {
            btn.className = "px-4 py-2 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 transition";
        } else {
            btn.className = "px-4 py-2 rounded-lg bg-gray-900 text-gray-400 font-medium hover:bg-gray-800 transition";
        }
    });

    if (sayfa === "analiz") {
        analizCiz();
        haritaCiz(); // Harita çizimini tetikle
    }
}

function haritaCiz() {
    const ulkeSayim = {};
    tumFilmler.forEach(f => {
        if (Array.isArray(f.ulkeler)) {
            f.ulkeler.forEach(u => {
                let temiz = u.trim();
                if (temiz) {
                    // Google Charts'ın dünyayı doğru tanıması için ufak çeviri
                    if (temiz.toLowerCase() === 'türkiye') temiz = 'Turkey';
                    if (temiz.toLowerCase() === 'abd' || temiz.toLowerCase() === 'amerika') temiz = 'United States';
                    if (temiz.toLowerCase() === 'ingiltere' || temiz.toLowerCase() === 'birleşik krallık') temiz = 'United Kingdom';
                    if (temiz.toLowerCase() === 'güney kore') temiz = 'South Korea';
                    
                    ulkeSayim[temiz] = (ulkeSayim[temiz] || 0) + 1;
                }
            });
        }
    });

    const veriDizisi = [['Ülke', 'Film Sayısı']];
    for (const [ulke, sayi] of Object.entries(ulkeSayim)) {
        veriDizisi.push([ulke, sayi]);
    }

    const data = google.visualization.arrayToDataTable(veriDizisi);
    const options = {
        backgroundColor: 'transparent',
        datalessRegionColor: '#1f2937', // İzlenmeyen ülkeler (koyu gri)
        defaultColor: '#14b8a6', // Ana renk turkuaz
        colorAxis: {colors: ['#0f766e', '#5eead4']}, // Turkuaz ton geçişleri
        legend: {textStyle: {color: '#9ca3af', fontSize: 12}}
    };

    const haritaKutu = document.getElementById('chart-harita');
    const chart = new google.visualization.GeoChart(haritaKutu);
    chart.draw(data, options);
}

function analizCiz() {
    document.getElementById("stat-toplam").innerText = tumFilmler.length;
    const ortPuan = tumFilmler.reduce((a, b) => a + (b.puan || 0), 0) / (tumFilmler.length || 1);
    document.getElementById("stat-ortalama").innerText = ortPuan.toFixed(2);

    const izlenenDk = tumFilmler.reduce((a, b) => a + (b.sure || 0), 0);
    const saat = izlenenDk / 60;
    const gun = saat / 24;
    document.getElementById("stat-sure").innerText = `${Math.floor(saat)} Saat`;
    document.getElementById("stat-gun").innerText = `${gun.toFixed(1)} Gün`;

    Object.values(charts).forEach(c => c.destroy());

    const top10 = [...tumFilmler].sort((a, b) => b.puan - a.puan).slice(0, 10);
    charts.top10 = new Chart(document.getElementById("chart-top10"), {
        type: 'bar',
        data: {
            labels: top10.map(f => f.adi),
            datasets: [{ label: 'IMDb Puanı', data: top10.map(f => f.puan), backgroundColor: '#2dd4bf' }]
        },
        options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#374151' } }, y: { grid: { display: false } } } }
    });

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
            datasets: [{ label: 'Film Sayısı', data: Object.keys(onyilSayim).sort().map(k => onyilSayim[k]), backgroundColor: '#0ea5e9' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#374151' } }, x: { grid: { display: false } } } }
    });

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
            datasets: [{ data: siraliTurler.map(t => t[1]), backgroundColor: ['#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b'], borderColor: '#111827' }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#9ca3af' } } } }
    });

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
            datasets: [{ data: Object.values(puanAraliklari), backgroundColor: ['#475569', '#3b82f6', '#10b981', '#f59e0b'], borderColor: '#111827' }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#9ca3af' } } } }
    });
}

// Fixed Header olduğu için küçülme efekti artık titreme yapmayacak
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

verileriYukle();
