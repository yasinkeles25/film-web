const BASE_URL = "https://film-api-ru0v.onrender.com"; 
const API_URL = `${BASE_URL}/filmler`;

let tumFilmler = [];
let aktifFilm = null;
let charts = {};

const temaEmojileri = {
    "Soygun ve Vurgun (Heist)": "💰",
    "Kumar ve Bahis Oyunları": "🎲",
    "Zaman Bükülmesi ve Döngüler": "⏳",
    "Zihin Manipülasyonu ve Gerçeklik": "🧠",
    "Yapay Zekâ ve Tekno-Distopya": "🤖",
    "Bireysel Adalet ve İntikam": "⚔️",
    "Hayatta Kalma (Survival)": "🏕️",
    "Organize Suç ve Yeraltı Dünyası": "🕶️",
    "Dehalar ve Biyografiler": "🔬",
    "Polisiye ve Gizem (Whodunit)": "🔍",
    "Casusluk ve Gizli Teşkilatlar": "🕵️",
    "Siperler ve Gerçek Harp Dramları": "🪖",
    "Hapishane ve Firar": "⛓️",
    "Hazine Avı ve Mitoloji": "🗺️",
    "Dövüş Disiplini ve Ring": "🥊",
    "Irkçılık ve Sivil Haklar": "✊"
};

let ozelEklenenTemalar = JSON.parse(localStorage.getItem("film_baykusu_ozel_temalar") || "{}");
let ozelEklenenSeriler = JSON.parse(localStorage.getItem("film_baykusu_ozel_seriler") || "[]");

function bildirimGoster(mesaj, tip = "basari") {
    const toast = document.getElementById("toast-kutu"), ikon = document.getElementById("toast-ikon"), mesajEl = document.getElementById("toast-mesaj");
    ikon.innerText = tip === "basari" ? "✅" : (tip === "hata" ? "⚠️" : "ℹ️");
    mesajEl.innerText = mesaj;
    if(tip === "hata") { toast.classList.replace("bg-teal-600", "bg-red-600"); toast.classList.replace("border-teal-400/50", "border-red-400/50"); }
    else { toast.classList.replace("bg-red-600", "bg-teal-600"); toast.classList.replace("border-red-400/50", "border-teal-400/50"); }
    toast.classList.remove("toast-enter"); toast.classList.add("toast-active");
    setTimeout(() => { toast.classList.remove("toast-active"); toast.classList.add("toast-enter"); }, 3500);
}

window.addEventListener("popstate", (e) => {
    if (e.state && e.state.sayfa) sayfaDegistir(e.state.sayfa, false);
    else {
        const hash = window.location.hash.replace("#", "");
        if(["galeri", "temalar", "seriler", "ekle", "analiz"].includes(hash)) sayfaDegistir(hash, false);
        else sayfaDegistir('galeri', false);
    }
});

function turNormallestir(t) {
    let temiz = t.trim().toLowerCase();
    if(temiz === "bilim-kurgu" || temiz === "bilimkurgu" || temiz === "sci-fi") return "Bilim Kurgu";
    return t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase();
}

function turkceKucult(metin) {
    if (!metin) return "";
    return metin.toString().replace(/İ/g, "i").replace(/I/g, "ı").replace(/Ş/g, "ş").replace(/Ğ/g, "ğ").replace(/Ü/g, "ü").replace(/Ö/g, "ö").replace(/Ç/g, "ç").toLocaleLowerCase('tr-TR').trim();
}

const ulkeSozlugu = {
    'türkiye': 'Turkey', 'turkiye': 'Turkey', 'turkey': 'Turkey', 'tr': 'Turkey',
    'abd': 'United States', 'amerika': 'United States', 'usa': 'United States', 'us': 'United States',
    'kanada': 'Canada', 'meksika': 'Mexico', 'brezilya': 'Brazil', 'arjantin': 'Argentina',
    'ingiltere': 'United Kingdom', 'birleşik krallık': 'United Kingdom', 'uk': 'United Kingdom',
    'ispanya': 'Spain', 'fransa': 'France', 'almanya': 'Germany', 'italya': 'Italy',
    'güney kore': 'South Korea', 'kore': 'South Korea', 'japonya': 'Japan', 'çin': 'China', 'hindistan': 'India'
};

google.charts.load('current', {'packages':['geochart']});

async function verileriYukle(denemeSayisi = 1, gorselYenile = true) {
    const galeri = document.getElementById("film-galerisi"), sayac = document.getElementById("liste-sayac");
    if (gorselYenile && denemeSayisi === 1) { galeri.innerHTML = `<div class="col-span-full py-20 text-center"><div class="inline-block animate-spin text-5xl mb-4">🦉</div><h3 class="text-lg font-bold text-white">Film Baykuşu Uyanıyor...</h3></div>`; sayac.innerText = "Yükleniyor..."; }

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Sunucu yanıt vermedi");
        let hamVeri = await res.json();
        tumFilmler = hamVeri.map(f => {
            if(f.turler) {
                let duzgunTurler = new Set();
                f.turler.forEach(t => t.split(/[,/&]/).forEach(p => { if(p.trim()) duzgunTurler.add(turNormallestir(p)); }));
                f.turler = Array.from(duzgunTurler);
            }
            return f;
        });
        dropdownlariDoldur(); filtrele();
    } catch (e) {
        if (gorselYenile) sayac.innerText = `Sunucu bekleniyor (${denemeSayisi})...`;
        if (denemeSayisi < 15) setTimeout(() => verileriYukle(denemeSayisi + 1, gorselYenile), 3000);
        else if (gorselYenile) galeri.innerHTML = `<div class="col-span-full py-12 text-center text-red-400">⚠️ Bağlantı zaman aşımına uğradı.</div>`;
    }
}

function dropdownlariDoldur() {
    const turlerSet = new Set(), yillarSet = new Set(), serilerSet = new Set([...ozelEklenenSeriler]), temalarSet = new Set([...Object.keys(temaEmojileri), ...Object.keys(ozelEklenenTemalar)]);
    tumFilmler.forEach(f => {
        if (Array.isArray(f.turler)) f.turler.forEach(t => turlerSet.add(t));
        if (f.yil && f.yil.trim()) yillarSet.add(f.yil.trim());
        if (f.seri && f.seri.trim()) serilerSet.add(f.seri.trim());
        if (f.temalar && f.temalar.trim()) f.temalar.split(",").forEach(t => { if(t.trim()) temalarSet.add(t.trim()); });
    });

    const turSelect = document.getElementById("tur-filtre"); turSelect.innerHTML = '<option value="Tümü">🎭 Tüm Türler</option>'; Array.from(turlerSet).sort().forEach(tur => turSelect.innerHTML += `<option value="${tur}">${tur}</option>`);
    const yilSelect = document.getElementById("yil-filtre"); yilSelect.innerHTML = '<option value="Tümü">📅 Tüm Yıllar</option>'; Array.from(yillarSet).sort((a, b) => b - a).forEach(yil => yilSelect.innerHTML += `<option value="${yil}">${yil}</option>`);

    const serilerDatalist = document.getElementById("mevcut-seriler-listesi"); if(serilerDatalist) { serilerDatalist.innerHTML = ""; Array.from(serilerSet).sort().forEach(s => { serilerDatalist.innerHTML += `<option value="${s}">`; }); }
    const temalarDatalist = document.getElementById("mevcut-temalar-listesi"); if(temalarDatalist) { temalarDatalist.innerHTML = ""; Array.from(temalarSet).sort().forEach(t => { temalarDatalist.innerHTML += `<option value="${t}">`; }); }
}

function hizliTemalariRenderEt(hedefDivId, inputId) {
    const div = document.getElementById(hedefDivId); if(!div) return; div.innerHTML = "";
    const tumTemalar = [...new Set([...Object.keys(temaEmojileri), ...Object.keys(ozelEklenenTemalar)])];
    tumFilmler.forEach(f => { if (f.temalar && f.temalar.trim() !== "") { f.temalar.split(",").map(t => t.trim()).forEach(t => { if (t && !tumTemalar.includes(t)) tumTemalar.push(t); }); } });

    tumTemalar.sort().forEach(t => {
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "bg-gray-800 text-gray-300 border border-gray-700 text-[10px] px-2 py-1 rounded hover:bg-teal-600 hover:text-white transition"; btn.innerText = `+ ${t}`;
        btn.onclick = () => { const input = document.getElementById(inputId); let val = input.value.split(",").map(x=>x.trim()).filter(Boolean); if(!val.includes(t)) { val.push(t); input.value = val.join(", "); } };
        div.appendChild(btn);
    });
}

function aramaSifirla() {
    document.getElementById("arama-input").value = ""; document.getElementById("tur-filtre").value = "Tümü"; document.getElementById("yil-filtre").value = "Tümü"; document.getElementById("puan-filtre").value = "0"; document.getElementById("siralama").value = "isim-asc"; filtrele();
}

function filtrele() {
    const aramaHam = document.getElementById("arama-input").value, aramaInput = turkceKucult(aramaHam), secilenTur = document.getElementById("tur-filtre").value, secilenYil = document.getElementById("yil-filtre").value, minPuan = parseFloat(document.getElementById("puan-filtre").value), siralamaTip = document.getElementById("siralama") ? document.getElementById("siralama").value : "isim-asc";
    let arananKelime = aramaInput, ozelUlke = "", ozelSeri = "", ozelTema = "", orjinalSeriAdi = "", orjinalTemaAdi = "";

    if (aramaInput.startsWith("ülke:") || aramaInput.startsWith("ulke:")) { ozelUlke = turkceKucult(aramaHam.split(":")[1]); arananKelime = ""; } 
    else if (aramaInput.startsWith("seri:")) { ozelSeri = turkceKucult(aramaHam.split(":")[1]); arananKelime = ""; } 
    else if (aramaInput.startsWith("tema:")) { ozelTema = turkceKucult(aramaHam.split(":")[1]); orjinalTemaAdi = aramaHam.split(":")[1].trim(); arananKelime = ""; }

    let filtrelenmis = tumFilmler.filter(film => {
        // Arama yaparken Hem İngilizce (adi) hem Türkçe (turkce_adi) içinde arar
        const adiUyar = arananKelime === "" || turkceKucult(film.adi).includes(arananKelime) || (film.turkce_adi && turkceKucult(film.turkce_adi).includes(arananKelime));
        const puanUyar = (film.puan || 0) >= minPuan;
        const yilUyar = (secilenYil === "Tümü") || (film.yil && film.yil.toString() === secilenYil);
        
        let turUyar = true; if (secilenTur !== "Tümü") turUyar = Array.isArray(film.turler) && film.turler.some(t => turkceKucult(t).includes(turkceKucult(secilenTur)));
        let ulkeUyar = true; if (ozelUlke !== "") ulkeUyar = Array.isArray(film.ulkeler) && film.ulkeler.some(u => { const uKucuk = turkceKucult(u); const ingilizceKarsilik = turkceKucult(ulkeSozlugu[uKucuk] || uKucuk); const ozelUlkeIngilizce = turkceKucult(ulkeSozlugu[ozelUlke] || ozelUlke); return uKucuk.includes(ozelUlke) || ingilizceKarsilik === ozelUlke || ingilizceKarsilik === ozelUlkeIngilizce || uKucuk === ozelUlkeIngilizce; });
        let seriUyar = true; if (ozelSeri !== "") { seriUyar = film.seri && turkceKucult(film.seri).includes(ozelSeri); if (seriUyar && orjinalSeriAdi === "") orjinalSeriAdi = film.seri; }
        let temaUyar = true; if (ozelTema !== "") { temaUyar = false; if (film.temalar) { const filmTemalariKucuk = turkceKucult(film.temalar); const temaKoku = ozelTema.split('(')[0].trim(); if (filmTemalariKucuk.includes(ozelTema) || filmTemalariKucuk.includes(temaKoku)) temaUyar = true; } }
        
        return adiUyar && puanUyar && turUyar && yilUyar && ulkeUyar && seriUyar && temaUyar;
    });

    filtrelenmis.sort((a, b) => {
        if(siralamaTip === "puan-desc") return (b.puan || 0) - (a.puan || 0);
        if(siralamaTip === "yil-desc") return parseInt(b.yil || 0) - parseInt(a.yil || 0);
        if(siralamaTip === "sure-asc") return (a.sure || 0) - (b.sure || 0);
        return a.adi.localeCompare(b.adi, 'tr');
    });

    galeriRender(filtrelenmis, orjinalSeriAdi, orjinalTemaAdi);
}

function galeriRender(filmler, aktifSeriAdi = "", aktifTemaAdi = "") {
    const galeri = document.getElementById("film-galerisi");
    document.getElementById("liste-sayac").innerText = `${filmler.length} film listelendi`;
    galeri.innerHTML = "";

    if (aktifSeriAdi !== "") {
        const headerDiv = document.createElement("div");
        headerDiv.className = "col-span-full bg-teal-900/20 border border-teal-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2";
        headerDiv.innerHTML = `<div><h3 class="text-lg font-bold text-teal-400">🎬 ${aktifSeriAdi}</h3><span class="text-xs text-gray-400">${filmler.length} Film</span></div><div class="flex gap-2"><button onclick="mevcutFilmEkleAc('seri', '${aktifSeriAdi}')" class="bg-gray-800 hover:bg-gray-700 text-teal-400 border border-teal-900 font-medium px-3 py-2 rounded-lg text-sm transition shadow-lg">🔄 Arşivden Seç</button><button onclick="koleksiyonaEkleYonlendir('seri', '${aktifSeriAdi}')" class="bg-teal-600 hover:bg-teal-500 text-white font-medium px-3 py-2 rounded-lg text-sm transition shadow-lg">➕ Sıfırdan Ekle</button></div>`;
        galeri.appendChild(headerDiv);
    }
    
    if (aktifTemaAdi !== "") {
        const emoji = temaEmojileri[aktifTemaAdi] || ozelEklenenTemalar[aktifTemaAdi] || "🏷️";
        const headerDiv = document.createElement("div");
        headerDiv.className = "col-span-full bg-teal-900/20 border border-teal-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2";
        headerDiv.innerHTML = `<div><h3 class="text-lg font-bold text-teal-400 flex items-center gap-2"><span>${emoji}</span> ${aktifTemaAdi}</h3><span class="text-xs text-gray-400">${filmler.length} Film</span></div><div class="flex gap-2"><button onclick="mevcutFilmEkleAc('tema', '${aktifTemaAdi}')" class="bg-gray-800 hover:bg-gray-700 text-teal-400 border border-teal-900 font-medium px-3 py-2 rounded-lg text-sm transition shadow-lg">🔄 Arşivden Seç</button><button onclick="koleksiyonaEkleYonlendir('tema', '${aktifTemaAdi}')" class="bg-teal-600 hover:bg-teal-500 text-white font-medium px-3 py-2 rounded-lg text-sm transition shadow-lg">➕ Sıfırdan Ekle</button></div>`;
        galeri.appendChild(headerDiv);
    }

    if (filmler.length === 0) {
        galeri.innerHTML += `<div class="col-span-full py-12 text-center text-gray-400 bg-gray-900/30 rounded-2xl border border-gray-800"><p class="text-base font-semibold">Bu alanda henüz kayıtlı film yok.</p></div>`;
        return;
    }

    filmler.forEach(film => {
        const afis = (film.afis_yolu && film.afis_yolu.startsWith("http")) ? film.afis_yolu : "https://via.placeholder.com/300x450/1f2937/9ca3af?text=Afis+Yok";
        const kart = document.createElement("div");
        kart.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-teal-500/50 hover:scale-105 transition cursor-pointer flex flex-col justify-between";
        kart.onclick = () => filmDetayAc(film.id);
        kart.innerHTML = `
            <img src="${afis}" loading="lazy" alt="${film.adi}" class="w-full h-72 object-cover" onerror="this.src='https://via.placeholder.com/300x450/1f2937/9ca3af?text=Afis+Yok';">
            <div class="p-3"><h4 class="font-bold text-sm truncate text-gray-100">${film.adi}</h4><div class="flex justify-between items-center text-xs text-gray-400 mt-1"><span>📅 ${film.yil || '?'}</span><span class="text-teal-400 font-semibold">⭐ ${film.puan || '0.0'}</span></div></div>
        `;
        galeri.appendChild(kart);
    });
}

function koleksiyonaEkleYonlendir(tip, isim) {
    sayfaDegistir('ekle');
    if (tip === 'seri') document.getElementById('ekle-seri').value = isim;
    if (tip === 'tema') { const input = document.getElementById('ekle-temalar'); input.value = input.value ? input.value + ", " + isim : isim; }
}

let aktifMevcutEklemeTipi = "", aktifMevcutEklemeIsmi = "";

function mevcutFilmEkleAc(tip, isim) {
    aktifMevcutEklemeTipi = tip; aktifMevcutEklemeIsmi = isim;
    document.getElementById("mevcut-film-baslik").innerText = `"${isim}" -> Arşivden Film Ekle`;
    const select = document.getElementById("mevcut-film-secim"); select.innerHTML = '<option value="">-- Arşivinizden Bir Film Seçin --</option>';
    tumFilmler.forEach(f => {
        if (tip === 'seri' && f.seri === isim) return;
        if (tip === 'tema' && f.temalar && f.temalar.split(",").map(x=>x.trim()).includes(isim)) return;
        // Seçim listesinde hangi isim daha uygunsa (İngilizce + Türkçe) onu gösterir
        select.innerHTML += `<option value="${f.id}">${f.adi} ${f.turkce_adi ? '('+f.turkce_adi+')' : ''} - ${f.yil}</option>`;
    });
    document.getElementById("mevcut-film-modal").classList.remove("hidden");
}

async function mevcutFilmKaydet() {
    const select = document.getElementById("mevcut-film-secim"); const filmId = select.value;
    if(!filmId) return bildirimGoster("Lütfen listeden bir film seçin.", "hata");
    const film = tumFilmler.find(f => f.id == filmId); if(!film) return;

    if (aktifMevcutEklemeTipi === 'seri') film.seri = aktifMevcutEklemeIsmi;
    else if (aktifMevcutEklemeTipi === 'tema') {
        const temalarList = film.temalar ? film.temalar.split(",").map(t => t.trim()).filter(Boolean) : [];
        if (!temalarList.includes(aktifMevcutEklemeIsmi)) temalarList.push(aktifMevcutEklemeIsmi);
        film.temalar = temalarList.join(", ");
    }
    document.getElementById("mevcut-film-modal").classList.add("hidden");
    await fetch(`${API_URL}/${film.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(film) });
    bildirimGoster("Film arşivi listeye başarıyla aktarıldı!"); verileriYukle(1, false); 
}

function serileriCiz() {
    const galeri = document.getElementById("seriler-galerisi"); galeri.innerHTML = "";
    const tumSerilerListesi = new Set([...ozelEklenenSeriler]);
    tumFilmler.forEach(f => { if (f.seri && f.seri.trim() !== "") tumSerilerListesi.add(f.seri.trim()); });
    
    if (tumSerilerListesi.size === 0) { galeri.innerHTML = `<div class="col-span-full py-12 text-center text-gray-500">Henüz seriye ait film veya koleksiyon yok.</div>`; return; }

    Array.from(tumSerilerListesi).sort().forEach(seriAdi => {
        const seriFilmleri = tumFilmler.filter(f => f.seri && turkceKucult(f.seri).includes(turkceKucult(seriAdi)));
        let afis = "https://via.placeholder.com/300x450/1f2937/9ca3af?text=Gorsel+Yok";
        if (seriFilmleri.length > 0 && seriFilmleri[0].afis_yolu && seriFilmleri[0].afis_yolu.startsWith("http")) afis = seriFilmleri[0].afis_yolu;

        const kart = document.createElement("div");
        kart.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-teal-500 hover:scale-105 transition cursor-pointer relative group";
        kart.onclick = () => { sayfaDegistir('galeri'); document.getElementById('arama-input').value = `seri:${seriAdi}`; filtrele(); };
        kart.innerHTML = `<img src="${afis}" loading="lazy" alt="${seriAdi}" class="w-full h-48 object-cover opacity-50 group-hover:opacity-80 transition" onerror="this.src='https://via.placeholder.com/300x450/1f2937/9ca3af?text=Gorsel+Yok';"><div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent p-4 flex flex-col justify-end"><h4 class="font-bold text-sm text-white drop-shadow-md">${seriAdi}</h4><p class="text-xs text-teal-400 mt-1 font-semibold">${seriFilmleri.length} Film</p></div>`;
        galeri.appendChild(kart);
    });
}

function temalariCiz() {
    const galeri = document.getElementById("temalar-galerisi"); galeri.innerHTML = "";
    const tumTemalarListesi = new Set([...Object.keys(temaEmojileri), ...Object.keys(ozelEklenenTemalar)]);
    tumFilmler.forEach(f => { if (f.temalar && f.temalar.trim() !== "") f.temalar.split(",").map(t => t.trim()).forEach(t => { if (t) tumTemalarListesi.add(t); }); });

    Array.from(tumTemalarListesi).sort().forEach(temaAdi => {
        const temaKucuk = turkceKucult(temaAdi), temaKoku = temaKucuk.split('(')[0].trim();
        const temaFilmleri = tumFilmler.filter(f => { if (!f.temalar) return false; const ft = turkceKucult(f.temalar); return ft.includes(temaKucuk) || ft.includes(temaKoku); });
        let afis = "https://via.placeholder.com/300x450/1f2937/9ca3af?text=Gorsel+Yok";
        if (temaFilmleri.length > 0 && temaFilmleri[0].afis_yolu && temaFilmleri[0].afis_yolu.startsWith("http")) afis = temaFilmleri[0].afis_yolu;

        const emoji = temaEmojileri[temaAdi] || ozelEklenenTemalar[temaAdi] || "🏷️";
        const kart = document.createElement("div");
        kart.className = "bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-teal-500 hover:scale-105 transition cursor-pointer relative group";
        kart.onclick = () => { sayfaDegistir('galeri'); document.getElementById('arama-input').value = `tema:${temaAdi}`; filtrele(); };
        kart.innerHTML = `<img src="${afis}" loading="lazy" alt="${temaAdi}" class="w-full h-48 object-cover opacity-30 group-hover:opacity-60 transition" onerror="this.src='https://via.placeholder.com/300x450/1f2937/9ca3af?text=Gorsel+Yok';"><div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent p-4 flex flex-col justify-between"><div class="flex justify-between items-start"><span class="text-3xl drop-shadow-lg">${emoji}</span><span class="bg-gray-950/80 text-teal-400 text-[10px] px-2.5 py-1 rounded-full border border-teal-900/60 font-mono font-bold">${temaFilmleri.length} Film</span></div><div><h4 class="font-bold text-sm text-white leading-snug drop-shadow-md">${temaAdi}</h4></div></div>`;
        galeri.appendChild(kart);
    });
}

function yeniTemaModalAc() { document.getElementById("yeni-tema-modal").classList.remove("hidden"); document.getElementById("yeni-tema-adi").focus(); }
function yeniTemaModalKapat() { document.getElementById("yeni-tema-modal").classList.add("hidden"); }
function yeniTemaKaydet(e) { e.preventDefault(); const ad = document.getElementById("yeni-tema-adi").value.trim(), emoji = document.getElementById("yeni-tema-emoji").value.trim() || "🏷️"; if (!ad) return; ozelEklenenTemalar[ad] = emoji; localStorage.setItem("film_baykusu_ozel_temalar", JSON.stringify(ozelEklenenTemalar)); yeniTemaModalKapat(); temalariCiz(); e.target.reset(); bildirimGoster("Yeni tema başarıyla oluşturuldu."); }

function yeniSeriModalAc() { document.getElementById("yeni-seri-modal").classList.remove("hidden"); document.getElementById("yeni-seri-adi").focus(); }
function yeniSeriModalKapat() { document.getElementById("yeni-seri-modal").classList.add("hidden"); }
function yeniSeriKaydet(e) { e.preventDefault(); const ad = document.getElementById("yeni-seri-adi").value.trim(); if (!ad) return; if(!ozelEklenenSeriler.includes(ad)) { ozelEklenenSeriler.push(ad); localStorage.setItem("film_baykusu_ozel_seriler", JSON.stringify(ozelEklenenSeriler)); } yeniSeriModalKapat(); serileriCiz(); e.target.reset(); bildirimGoster("Yeni seri başarıyla oluşturuldu."); }

async function tmdbVeriCek() {
    const arama = document.getElementById("tmdb-arama").value.trim();
    if (!arama) return bildirimGoster("Lütfen film adı yazın!", "hata");
    const buton = document.querySelector("button[onclick='tmdbVeriCek()']"), orjinalMetin = buton.innerText;
    buton.innerText = "⏳ Aranıyor..."; buton.disabled = true;

    try {
        const res = await fetch(`${BASE_URL}/tmdb/ara?film_adi=${encodeURIComponent(arama)}`);
        const data = await res.json();
        
        if (data.hata) bildirimGoster(data.hata, "hata");
        else if (data.sonuclar && data.sonuclar.length > 0) {
            const listeDiv = document.getElementById("tmdb-sonuclar-listesi"); listeDiv.innerHTML = "";
            data.sonuclar.forEach(film => {
                const afis = film.afis ? film.afis : "https://via.placeholder.com/100x150/1f2937/9ca3af?text=Afis+Yok";
                listeDiv.innerHTML += `<div onclick="tmdbFilmSec(${film.tmdb_id})" class="flex gap-4 items-center bg-gray-950 p-3 rounded-lg border border-gray-800 hover:border-teal-500 cursor-pointer transition"><img src="${afis}" class="w-12 h-16 object-cover rounded"><div><h4 class="text-sm font-bold text-gray-200">${film.adi}</h4><span class="text-xs text-teal-400">${film.yil}</span></div></div>`;
            });
            document.getElementById("tmdb-secim-modal").classList.remove("hidden");
        } else { bildirimGoster("Film bulunamadı!", "hata"); }
    } catch (e) { bildirimGoster("Bağlantı hatası.", "hata"); } finally { buton.innerText = orjinalMetin; buton.disabled = false; }
}

async function tmdbFilmSec(tmdb_id) {
    document.getElementById("tmdb-secim-modal").classList.add("hidden");
    const buton = document.querySelector("button[onclick='tmdbVeriCek()']");
    buton.innerText = "⏳ Dolduruluyor..."; buton.disabled = true;

    try {
        const res = await fetch(`${BASE_URL}/tmdb/detay/${tmdb_id}`);
        const data = await res.json();
        if (data.hata) bildirimGoster(data.hata, "hata");
        else {
            // İNGİLİZCE (ORİJİNAL) VE TÜRKÇE ADI AYRI AYRI DOLDURULUYOR
            document.getElementById("ekle-adi").value = data.adi || "";
            document.getElementById("ekle-turkce-adi").value = data.turkce_adi || "";
            document.getElementById("ekle-yil").value = data.yil || "";
            document.getElementById("ekle-puan").value = data.puan || 0;
            document.getElementById("ekle-sure").value = data.sure || 0;
            document.getElementById("ekle-ozet").value = data.ozet || "";
            document.getElementById("ekle-afis").value = data.afis_yolu || "";
            if (data.turler) document.getElementById("ekle-turler").value = data.turler.map(t => turNormallestir(t)).join(", ");
            if (data.ulkeler) document.getElementById("ekle-ulkeler").value = data.ulkeler.join(", ");
            if (data.seri) document.getElementById("ekle-seri").value = data.seri;
            bildirimGoster("Veriler İngilizce orijinal afişiyle birlikte dolduruldu!");
        }
    } catch (e) { bildirimGoster("Detay çekilirken hata oluştu.", "hata"); } finally { buton.innerText = "Otomatik Doldur"; buton.disabled = false; }
}

async function filmDetayAc(id) {
    const res = await fetch(`${API_URL}/${id}`);
    aktifFilm = await res.json();
    detayGorunumuRender();
    document.getElementById("film-modal").classList.remove("hidden");
}

async function temaCikar(temaAdi) {
    if (!confirm(`"${temaAdi}" etiketini bu filmden çıkarmak istediğinize emin misiniz?`)) return;
    const yeniTemalar = aktifFilm.temalar.split(",").map(t=>t.trim()).filter(t => t !== temaAdi);
    aktifFilm.temalar = yeniTemalar.join(", ");
    await fetch(`${API_URL}/${aktifFilm.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aktifFilm) });
    detayGorunumuRender(); verileriYukle(1, false); bildirimGoster("Tema filmden çıkarıldı.");
}

async function seriCikar() {
    if (!confirm(`Bu filmi "${aktifFilm.seri}" serisinden çıkarmak istediğinize emin misiniz?`)) return;
    aktifFilm.seri = "";
    await fetch(`${API_URL}/${aktifFilm.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aktifFilm) });
    detayGorunumuRender(); verileriYukle(1, false); bildirimGoster("Film seriden çıkarıldı.");
}

function detayGorunumuRender() {
    const container = document.getElementById("modal-icerik");
    document.getElementById("modal-baslik").innerText = aktifFilm.adi; // Orijinal Ad
    const afis = (aktifFilm.afis_yolu && aktifFilm.afis_yolu.startsWith("http")) ? aktifFilm.afis_yolu : "https://via.placeholder.com/300x450/1f2937/9ca3af?text=Afis+Yok";

    const turkceAdiBileseni = (aktifFilm.turkce_adi && aktifFilm.turkce_adi.trim() !== "" && aktifFilm.turkce_adi !== aktifFilm.adi) 
        ? `<div class="text-sm text-gray-400 mb-3 italic font-semibold">🇹🇷 ${aktifFilm.turkce_adi}</div>` : "";

    const seriBileşeni = (aktifFilm.seri && aktifFilm.seri.trim() !== "") 
        ? `<div class="bg-teal-900/40 border border-teal-800 text-teal-400 text-[11px] px-2.5 py-1 rounded inline-flex items-center gap-2 mb-2">🎬 ${aktifFilm.seri} <button onclick="seriCikar()" class="text-red-400 hover:text-red-300 font-bold ml-1" title="Seriden Çıkar">✕</button></div>` : "";
    
    let temaBileşeni = "";
    if (aktifFilm.temalar && aktifFilm.temalar.trim() !== "") {
        const temalarDizi = aktifFilm.temalar.split(",").map(t => t.trim());
        temaBileşeni = temalarDizi.map(t => {
            const emoji = temaEmojileri[t] || ozelEklenenTemalar[t] || "🏷️";
            return `<span class="bg-gray-800 border border-gray-700 text-gray-300 text-[10px] px-2 py-0.5 rounded-full mr-1 inline-flex items-center gap-1 mb-1">${emoji} ${t} <button onclick="temaCikar('${t}')" class="text-red-400 hover:text-red-300 font-bold ml-1" title="Temadan Çıkar">✕</button></span>`;
        }).join('');
    }

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-6">
            <img src="${afis}" class="w-full sm:w-48 h-64 object-cover rounded-lg border border-gray-800">
            <div class="space-y-2 flex-1">
                ${turkceAdiBileseni}
                <div>${seriBileşeni}</div>
                <div class="mb-2">${temaBileşeni}</div>
                <div class="flex gap-3 text-sm text-gray-300 font-medium"><span>📅 ${aktifFilm.yil || '?'}</span><span>⏱️ ${aktifFilm.sure || 0} dk</span><span class="text-teal-400">⭐ ${aktifFilm.puan || 0}/10</span></div>
                <p class="text-xs text-gray-400"><strong>Türler:</strong> ${(aktifFilm.turler || []).join(", ") || '-'}</p>
                <p class="text-xs text-gray-400"><strong>Ülkeler:</strong> ${(aktifFilm.ulkeler || []).join(", ") || '-'}</p>
                <p class="text-xs text-teal-400 font-semibold">✅ İzlendi (${aktifFilm.izlenme_tarihi || 'Tarih Yok'})</p>
                <div class="mt-3"><h5 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Özet</h5><p class="text-sm text-gray-300 mt-1 leading-relaxed">${aktifFilm.ozet || '-'}</p></div>
                <div class="mt-4 bg-gray-900 p-4 rounded-xl border border-teal-900/50 flex gap-4 items-start relative shadow-md">
                    <img src="logo.jpg" class="w-12 h-12 rounded-full border-2 border-teal-500 bg-gray-950">
                    <div class="bg-gray-800 p-3 rounded-2xl rounded-tl-none flex-1"><h5 class="text-xs font-bold text-teal-400 mb-1">Kişisel Düşüncelerim</h5><p class="text-sm text-gray-300 italic whitespace-pre-wrap">${aktifFilm.notlar || 'Not eklemedin.'}</p></div>
                </div>
            </div>
        </div>
        <div class="border-t border-gray-800 pt-4 flex justify-end gap-3 mt-4">
            <button onclick="duzenleGorunumuRender()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">✏️ Düzenle</button>
            <button onclick="filmSil(${aktifFilm.id})" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">🗑️ Sil</button>
        </div>
    `;
}

function duzenleGorunumuRender() {
    const container = document.getElementById("modal-icerik");
    document.getElementById("modal-baslik").innerText = `Düzenle: ${aktifFilm.adi}`;
    const defaultTarih = aktifFilm.izlenme_tarihi ? aktifFilm.izlenme_tarihi : bugununTarihi();

    container.innerHTML = `
        <form onsubmit="filmGuncelle(event)" class="space-y-3">
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs text-gray-400">Orijinal Adı</label><input type="text" id="d-adi" value="${aktifFilm.adi}" required class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm focus:border-teal-500 text-white"></div>
                <div><label class="block text-xs text-gray-400">Türkçe Adı</label><input type="text" id="d-turkce-adi" value="${aktifFilm.turkce_adi || ''}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm focus:border-teal-500 text-gray-300"></div>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div><label class="block text-xs text-gray-400">Yıl</label><input type="text" id="d-yil" value="${aktifFilm.yil || ''}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm"></div>
                <div><label class="block text-xs text-gray-400">Puan</label><input type="number" step="0.1" id="d-puan" value="${aktifFilm.puan || 0}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm"></div>
                <div><label class="block text-xs text-gray-400">Süre</label><input type="number" id="d-sure" value="${aktifFilm.sure || 0}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm"></div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div><label class="block text-xs text-gray-400">Türler</label><input type="text" id="d-turler" value="${(aktifFilm.turler || []).join(', ')}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm"></div>
                <div><label class="block text-xs text-gray-400">Ülkeler</label><input type="text" id="d-ulkeler" value="${(aktifFilm.ulkeler || []).join(', ')}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm"></div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div><label class="block text-xs text-gray-400">Seri</label><input type="text" id="d-seri" list="mevcut-seriler-listesi" value="${aktifFilm.seri || ''}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm"></div>
                <div>
                    <label class="block text-xs text-teal-400 font-bold">🏷️ Temalar</label>
                    <input type="text" id="d-temalar" list="mevcut-temalar-listesi" value="${aktifFilm.temalar || ''}" class="w-full bg-gray-950 border border-teal-900 rounded p-2 text-sm focus:border-teal-500">
                    <div id="hizli-temalar-duzenle" class="flex flex-wrap gap-1 mt-2"></div>
                </div>
            </div>
            <div><label class="block text-xs text-gray-400">Afiş URL</label><input type="text" id="d-afis" value="${aktifFilm.afis_yolu || ''}" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-teal-400"></div>
            <div><label class="block text-xs text-gray-400">Özet</label><textarea id="d-ozet" rows="2" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm">${aktifFilm.ozet || ''}</textarea></div>
            <div><label class="block text-xs text-teal-400">🦉 Kişisel Düşüncelerim</label><textarea id="d-notlar" rows="3" class="w-full bg-gray-950 border border-teal-900 rounded p-2 text-sm">${aktifFilm.notlar || ''}</textarea></div>
            <div><label class="block text-xs text-gray-400">Tarih</label><input type="date" id="d-tarih" value="${defaultTarih}" class="bg-gray-950 border border-gray-800 rounded p-2 text-sm w-full"></div>
            <div class="flex justify-end gap-2 pt-2"><button type="button" onclick="detayGorunumuRender()" class="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm">İptal</button><button type="submit" class="px-4 py-1.5 bg-teal-600 text-white rounded text-sm">Kaydet</button></div>
        </form>
    `;
    hizliTemalariRenderEt('hizli-temalar-duzenle', 'd-temalar');
}

async function filmGuncelle(e) {
    e.preventDefault();
    const guncelVeri = {
        adi: document.getElementById("d-adi").value.trim(), 
        turkce_adi: document.getElementById("d-turkce-adi").value.trim(),
        yil: document.getElementById("d-yil").value.trim(),
        puan: parseFloat(document.getElementById("d-puan").value) || 0.0, sure: parseInt(document.getElementById("d-sure").value) || 0,
        turler: document.getElementById("d-turler").value.split(",").map(t => turNormallestir(t)).filter(Boolean),
        ulkeler: document.getElementById("d-ulkeler").value.split(",").map(u => u.trim()).filter(Boolean),
        seri: document.getElementById("d-seri").value.trim(), temalar: document.getElementById("d-temalar").value.trim(),
        afis_yolu: document.getElementById("d-afis").value.trim(), ozet: document.getElementById("d-ozet").value.trim(),
        notlar: document.getElementById("d-notlar").value.trim(), izlendi: true, izlenme_tarihi: document.getElementById("d-tarih").value.trim()
    };
    await fetch(`${API_URL}/${aktifFilm.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(guncelVeri) });
    modalKapat(); bildirimGoster("Film başarıyla güncellendi."); verileriYukle(1, false);
}

async function filmSil(id) {
    if (confirm("Silmek istediğinize emin misiniz?")) { 
        await fetch(`${API_URL}/${id}`, { method: "DELETE" }); 
        modalKapat(); bildirimGoster("Film silindi.", "hata"); verileriYukle(1, false); 
    }
}

async function filmEkle(e) {
    e.preventDefault();
    const notEl = document.getElementById("ekle-notlar");
    const yeniVeri = {
        adi: document.getElementById("ekle-adi").value.trim(), 
        turkce_adi: document.getElementById("ekle-turkce-adi").value.trim(),
        yil: document.getElementById("ekle-yil").value.trim(),
        puan: parseFloat(document.getElementById("ekle-puan").value) || 0.0, sure: parseInt(document.getElementById("ekle-sure").value) || 0,
        turler: document.getElementById("ekle-turler").value.split(",").map(t => turNormallestir(t)).filter(Boolean),
        ulkeler: document.getElementById("ekle-ulkeler").value.split(",").map(u => u.trim()).filter(Boolean),
        seri: document.getElementById("ekle-seri").value.trim(), temalar: document.getElementById("ekle-temalar").value.trim(),
        afis_yolu: document.getElementById("ekle-afis").value.trim(), ozet: document.getElementById("ekle-ozet").value.trim(),
        notlar: notEl ? notEl.value.trim() : "", izlendi: true, izlenme_tarihi: document.getElementById("ekle-tarih").value.trim()
    };
    await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(yeniVeri) });
    e.target.reset(); sayfaDegistir('galeri'); bildirimGoster("Film arşive eklendi!"); verileriYukle(1, false);
}

function modalKapat() { document.getElementById("film-modal").classList.add("hidden"); aktifFilm = null; }

function sayfaDegistir(sayfa, pushHistory = true) {
    document.getElementById("sec-galeri").classList.toggle("hidden", sayfa !== "galeri");
    document.getElementById("sec-temalar").classList.toggle("hidden", sayfa !== "temalar");
    document.getElementById("sec-seriler").classList.toggle("hidden", sayfa !== "seriler");
    document.getElementById("sec-ekle").classList.toggle("hidden", sayfa !== "ekle");
    document.getElementById("sec-analiz").classList.toggle("hidden", sayfa !== "analiz");

    if (pushHistory) window.history.pushState({sayfa: sayfa}, "", "#" + sayfa);

    if (sayfa === "ekle") {
        document.getElementById("ekle-tarih").value = bugununTarihi();
        hizliTemalariRenderEt('hizli-temalar-ekle', 'ekle-temalar');
    }

    ["galeri", "temalar", "seriler", "ekle", "analiz"].forEach(s => {
        const btn = document.getElementById(`nav-${s}`);
        if (s === sayfa) btn.className = "px-4 py-2 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 transition whitespace-nowrap";
        else btn.className = "px-4 py-2 rounded-lg bg-gray-900 text-gray-400 font-medium hover:bg-gray-800 transition whitespace-nowrap";
    });

    if (sayfa === "seriler") serileriCiz();
    else if (sayfa === "temalar") temalariCiz();
    else if (sayfa === "analiz") { analizCiz(); haritaCiz(); }
}

function aiSohbetToggle() {
    const kutu = document.getElementById("ai-sohbet-kutu");
    if (!kutu) return;
    kutu.classList.toggle("hidden");
    if (!kutu.classList.contains("hidden")) { setTimeout(() => { const i = document.getElementById("ai-input"); if (i) i.focus(); }, 50); }
}

async function aiMesajGonder() {
    const input = document.getElementById("ai-input"), mesajlar = document.getElementById("ai-mesajlar"), btn = document.getElementById("ai-gonder-btn");
    const soru = input.value.trim(); if (!soru) return;

    mesajlar.innerHTML += `<div class="flex justify-end"><div class="bg-teal-600 text-white p-3 rounded-xl rounded-tr-none max-w-[85%] shadow-md">${soru}</div></div>`;
    input.value = ""; mesajlar.scrollTop = mesajlar.scrollHeight;

    const yukleniyorId = `loading-${Date.now()}`;
    mesajlar.innerHTML += `<div id="${yukleniyorId}" class="flex justify-start"><div class="bg-gray-800 text-gray-400 p-3 rounded-xl rounded-tl-none border border-gray-700 max-w-[85%] italic flex items-center gap-2"><span class="animate-bounce">🦉</span> Arşiv taranıyor...</div></div>`;
    mesajlar.scrollTop = mesajlar.scrollHeight; btn.disabled = true;

    try {
        const res = await fetch(`${BASE_URL}/ai/sohbet`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soru: soru }) });
        const data = await res.json();
        const yukleniyorEl = document.getElementById(yukleniyorId); if (yukleniyorEl) yukleniyorEl.remove();
        mesajlar.innerHTML += `<div class="flex justify-start"><div class="bg-gray-800 text-gray-200 p-3 rounded-xl rounded-tl-none border border-teal-900/60 max-w-[85%] whitespace-pre-wrap shadow-md">${data.cevap || 'Yanıt alınamadı.'}</div></div>`;
    } catch (e) {
        const yukleniyorEl = document.getElementById(yukleniyorId); if (yukleniyorEl) yukleniyorEl.remove();
        mesajlar.innerHTML += `<div class="bg-red-950/80 text-red-300 p-3 rounded-xl border border-red-800">Bağlantı kurulamadı.</div>`;
    } finally { btn.disabled = false; mesajlar.scrollTop = mesajlar.scrollHeight; }
}

function haritaCiz() {
    const ulkeSayim = {};
    tumFilmler.forEach(f => {
        if (Array.isArray(f.ulkeler)) {
            f.ulkeler.forEach(u => {
                const parcalar = u.split(/[,/&]/);
                parcalar.forEach(p => {
                    const temizKucuk = turkceKucult(p);
                    if (temizKucuk) {
                        const eslesenUlke = ulkeSozlugu[temizKucuk] || (p.trim().charAt(0).toUpperCase() + p.trim().slice(1));
                        ulkeSayim[eslesenUlke] = (ulkeSayim[eslesenUlke] || 0) + 1;
                    }
                });
            });
        }
    });

    const data = google.visualization.arrayToDataTable([['Ülke', 'Film Sayısı'], ...Object.entries(ulkeSayim)]);
    const chart = new google.visualization.GeoChart(document.getElementById('chart-harita'));
    google.visualization.events.addListener(chart, 'select', () => {
        const selection = chart.getSelection();
        if (selection.length > 0) { sayfaDegistir('galeri'); document.getElementById('arama-input').value = `ülke:${data.getValue(selection[0].row, 0)}`; filtrele(); }
    });
    chart.draw(data, { backgroundColor: 'transparent', datalessRegionColor: '#1e293b', defaultColor: '#14b8a6', colorAxis: {colors: ['#0f766e', '#2dd4bf', '#a7f3d0']}, legend: {textStyle: {color: '#9ca3af', fontSize: 12}} });
}

function analizCiz() {
    document.getElementById("stat-toplam").innerText = tumFilmler.length;
    const ortPuan = tumFilmler.reduce((a, b) => a + (b.puan || 0), 0) / (tumFilmler.length || 1);
    document.getElementById("stat-ortalama").innerText = ortPuan.toFixed(2);
    const izlenenDk = tumFilmler.reduce((a, b) => a + (b.sure || 0), 0);
    document.getElementById("stat-sure").innerText = `${Math.floor(izlenenDk / 60)} Saat`;
    document.getElementById("stat-gun").innerText = `${(izlenenDk / 60 / 24).toFixed(1)} Gün`;

    Object.values(charts).forEach(c => c.destroy());
    const top10 = [...tumFilmler].sort((a, b) => b.puan - a.puan).slice(0, 10);
    charts.top10 = new Chart(document.getElementById("chart-top10"), { type: 'bar', data: { labels: top10.map(f => f.adi), datasets: [{ label: 'IMDb Puanı', data: top10.map(f => f.puan), backgroundColor: '#2dd4bf' }] }, options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } } });
    const onyilSayim = {};
    tumFilmler.forEach(f => { const y = parseInt(f.yil); if (!isNaN(y)) { const onyil = `${Math.floor(y / 10) * 10}'ler`; onyilSayim[onyil] = (onyilSayim[onyil] || 0) + 1; } });
    charts.onyil = new Chart(document.getElementById("chart-onyil"), { type: 'bar', data: { labels: Object.keys(onyilSayim).sort(), datasets: [{ label: 'Film Sayısı', data: Object.keys(onyilSayim).sort().map(k => onyilSayim[k]), backgroundColor: '#0ea5e9' }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
    const turSayim = {};
    tumFilmler.forEach(f => { if (Array.isArray(f.turler)) f.turler.forEach(t => t.split(/[,/&]/).forEach(p => { const temiz = p.trim(); if (temiz) { const f = turNormallestir(temiz); turSayim[f] = (turSayim[f] || 0) + 1; } })); });
    const siraliTurler = Object.entries(turSayim).sort((a, b) => b[1] - a[1]).slice(0, 7);
    charts.turler = new Chart(document.getElementById("chart-turler"), { type: 'doughnut', data: { labels: siraliTurler.map(t => t[0]), datasets: [{ data: siraliTurler.map(t => t[1]), backgroundColor: ['#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b'], borderColor: '#111827' }] }, options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#9ca3af' } } } } });
    const puanAraliklari = { '1-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
    tumFilmler.forEach(f => { const p = f.puan || 0; if (p < 5) puanAraliklari['1-4']++; else if (p < 7) puanAraliklari['5-6']++; else if (p < 9) puanAraliklari['7-8']++; else puanAraliklari['9-10']++; });
    charts.puan = new Chart(document.getElementById("chart-puan"), { type: 'pie', data: { labels: Object.keys(puanAraliklari), datasets: [{ data: Object.values(puanAraliklari), backgroundColor: ['#475569', '#3b82f6', '#10b981', '#f59e0b'], borderColor: '#111827' }] }, options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#9ca3af' } } } } });
}

document.addEventListener("DOMContentLoaded", () => {
    verileriYukle(1, true).then(() => {
        const hash = window.location.hash.replace("#", "");
        if(["galeri", "temalar", "seriler", "ekle", "analiz"].includes(hash)) sayfaDegistir(hash, false);
        else sayfaDegistir('galeri', false);
    });
});
