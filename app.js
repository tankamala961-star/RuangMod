const initialMods = [
  {
    id: "visual-essentials",
    name: "Visual Essentials",
    category: "Visual",
    description: "Preset visual ringan untuk memberi suasana berbeda tanpa mengubah gameplay.",
    version: "v1.2",
    size: "18 MB",
    symbol: "V",
    downloadUrl: ""
  },
  {
    id: "hud-clean",
    name: "HUD Clean Pack",
    category: "UI",
    description: "Kumpulan elemen HUD minimalis agar tampilan layar terasa lebih rapi.",
    version: "v2.0",
    size: "4 MB",
    symbol: "⌗",
    downloadUrl: ""
  },
  {
    id: "handling-tools",
    name: "Handling Toolkit",
    category: "Tools",
    description: "Utilities komunitas untuk membantu mengatur dan menguji handling kendaraan.",
    version: "v1.0",
    size: "2 MB",
    symbol: "⌁",
    downloadUrl: ""
  },
  {
    id: "vehicle-pack",
    name: "Vehicle Pack SA-MP",
    category: "Kendaraan",
    description: "Koleksi kendaraan kustom untuk memperbarui tampilan kendaraan di SA-MP. Baca petunjuk pemasangan dan pastikan kompatibel dengan server yang digunakan.",
    version: "v1.0",
    size: "Belum tersedia",
    symbol: "V",
    downloadUrl: ""
  },
  {
    id: "street-audio",
    name: "Street Audio Pack",
    category: "Audio",
    description: "Koleksi audio bertema jalanan untuk pengalaman bermain yang lebih imersif.",
    version: "v1.4",
    size: "32 MB",
    symbol: "♫",
    downloadUrl: ""
  },
  {
    id: "map-markers",
    name: "Map Marker Set",
    category: "UI",
    description: "Set ikon marker peta dengan gaya sederhana dan mudah dibedakan.",
    version: "v1.1",
    size: "6 MB",
    symbol: "⌖",
    downloadUrl: ""
  },
  {
    id: "performance-notes",
    name: "Performance Notes",
    category: "Tools",
    description: "Panduan komunitas berisi checklist pengaturan untuk membantu optimasi client.",
    version: "v1.0",
    size: "1 MB",
    symbol: "↗",
    downloadUrl: ""
  }
];

const archiveSignatures = {
  zip: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]],
  rar: [[0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00], [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]],
  "7z": [[0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]]
};
const fileSignatures = {
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  bmp: [[0x42, 0x4d]]
};
const palettes = {
  Visual: ["#2b3123", "#d0f66d", "V"],
  UI: ["#252d32", "#a9d9e5", "⌗"],
  Tools: ["#332a22", "#f4b77a", "⌁"],
  Audio: ["#32252c", "#efa8c5", "♫"],
  Kendaraan: ["#292d24", "#c5e777", "V"],
  Gameplay: ["#30272b", "#f1a6a6", "G"],
  Lainnya: ["#252b35", "#adc2f5", "✳"]
};
const grid = document.querySelector("#mod-grid");
const filters = document.querySelector("#category-filters");
const searchInput = document.querySelector("#search-input");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const emptyStateIcon = document.querySelector("#empty-state-icon");
const emptyStateTitle = document.querySelector("#empty-state-title");
const emptyStateDescription = document.querySelector("#empty-state-description");
const createFirstModButton = document.querySelector("#create-first-mod");
const dialog = document.querySelector("#mod-dialog");
const uploadForm = document.querySelector("#upload-form");
const folderInput = document.querySelector("#upload-folder");
const chooseFolderButton = document.querySelector("#choose-folder-button");
const folderSelection = document.querySelector("#folder-selection");
const analysisPanel = document.querySelector("#analysis-result");
const analyzeButton = document.querySelector("#analyze-button");
const publishButton = document.querySelector("#publish-button");
const uploadStatus = document.querySelector("#upload-status");
let mods = [...initialMods];
let activeCategory = "Semua";
let analyzedFolder = null;
let storageReady = false;
let database;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ruangmod-community", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("mods", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getUploadedMods() {
  return new Promise((resolve, reject) => {
    const request = database.transaction("mods", "readonly").objectStore("mods").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveUploadedMod(mod) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("mods", "readwrite");
    transaction.objectStore("mods").put(mod);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Penyimpanan dibatalkan."));
  });
}

function getUploadedMod(id) {
  return new Promise((resolve, reject) => {
    const request = database.transaction("mods", "readonly").objectStore("mods").get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFilters() {
  const categories = ["Semua", ...Object.keys(palettes)];
  if (!categories.includes(activeCategory)) activeCategory = "Semua";
  filters.innerHTML = categories.map((category) => `
    <button class="filter-button" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === activeCategory}">
      ${escapeHtml(category)}
    </button>
  `).join("");
}

function renderMods() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const visibleMods = mods.filter((mod) => {
    const matchesCategory = activeCategory === "Semua" || mod.category === activeCategory;
    const searchableText = `${mod.name} ${mod.category} ${mod.description} ${mod.author || ""}`.toLocaleLowerCase("id");
    return matchesCategory && searchableText.includes(query);
  });

  grid.innerHTML = visibleMods.map((mod) => {
    const [background, color, symbol] = palettes[mod.category] || palettes.Lainnya;
    const downloadAction = mod.fileId
      ? `<button class="download-button" type="button" data-download-id="${escapeHtml(mod.fileId)}">Unduh ↓</button>`
      : mod.downloadUrl
        ? `<a class="download-button" href="${escapeHtml(mod.downloadUrl)}" download>Unduh ↓</a>`
        : "";
    return `
      <article class="mod-card">
        <div class="card-art" style="--card-bg:${background};--card-color:${color}">
          <span class="card-symbol" aria-hidden="true">${escapeHtml(mod.symbol || symbol)}</span>
        </div>
        <div class="card-body">
          <div class="card-topline"><span class="category-tag">${escapeHtml(mod.category)}</span></div>
          <h3>${escapeHtml(mod.name)}</h3>
          <p>${escapeHtml(mod.description)}</p>
          ${mod.author ? `<p class="card-author">Dibagikan oleh ${escapeHtml(mod.author)}</p>` : ""}
          <div class="card-actions">
            <button class="details-button" type="button" data-details="${escapeHtml(mod.id)}">Buka ↗</button>
            ${downloadAction}
          </div>
        </div>
      </article>
    `;
  }).join("");

  resultsCount.textContent = `${visibleMods.length} MOD DITEMUKAN`;
  emptyState.hidden = visibleMods.length > 0;
  grid.hidden = visibleMods.length === 0;
  const isEmptyArchive = visibleMods.length === 0 && !query && activeCategory !== "Semua";
  emptyStateIcon.textContent = isEmptyArchive ? "＋" : "⌕";
  emptyStateTitle.textContent = isEmptyArchive
    ? `Belum ada mod di arsip ${activeCategory}.`
    : "Belum ada mod yang cocok.";
  emptyStateDescription.textContent = isEmptyArchive
    ? "Jadilah yang pertama membagikan mod ke arsip ini."
    : "Coba kata kunci atau kategori lain.";
  createFirstModButton.hidden = !isEmptyArchive;
}

function showDetails(mod) {
  document.querySelector("#dialog-category").textContent = mod.category.toUpperCase();
  document.querySelector("#dialog-title").textContent = mod.name;
  document.querySelector("#dialog-description").textContent = mod.description;
  document.querySelector("#dialog-version").textContent = mod.version;
  document.querySelector("#dialog-size").textContent = `${mod.size}${mod.author ? ` · oleh ${mod.author}` : ""}`;

  const downloadLink = document.querySelector("#dialog-download");
  const unavailableNote = document.querySelector("#dialog-unavailable");
  downloadLink.hidden = !mod.downloadUrl && !mod.fileId;
  unavailableNote.hidden = Boolean(mod.downloadUrl || mod.fileId);
  if (mod.fileId) {
    downloadLink.href = "#";
    downloadLink.dataset.downloadId = mod.fileId;
    downloadLink.removeAttribute("download");
  } else if (mod.downloadUrl) {
    downloadLink.href = mod.downloadUrl;
    downloadLink.download = "";
    delete downloadLink.dataset.downloadId;
  } else {
    downloadLink.removeAttribute("download");
    delete downloadLink.dataset.downloadId;
  }
  dialog.showModal();
}

function matchesSignature(bytes, signatures) {
  return signatures.some((signature) => signature.every((byte, index) => bytes[index] === byte));
}

async function analyzeFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  if (archiveSignatures[extension]) {
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!matchesSignature(header, archiveSignatures[extension])) {
      throw new Error(`Isi berkas tidak cocok dengan format .${extension.toUpperCase()}.`);
    }
  }

  if (fileSignatures[extension]) {
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!matchesSignature(header, fileSignatures[extension])) {
      throw new Error(`Isi berkas tidak cocok dengan format .${extension.toUpperCase()}.`);
    }
  }

  if (!crypto.subtle) throw new Error("Browser ini tidak mendukung analisis SHA-256. Buka situs melalui koneksi aman (HTTPS).");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { extension, sha256 };
}

function getRelativePath(file) {
  const rawPath = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
  if (rawPath.startsWith("/") || /^[a-z]:/i.test(rawPath)) {
    throw new Error("Folder berisi jalur file yang tidak valid.");
  }
  const parts = rawPath.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes(":"))) {
    throw new Error("Folder berisi nama file atau jalur yang tidak valid.");
  }
  const relativeParts = parts.length > 1 ? parts.slice(1) : parts;
  if (!relativeParts.length) {
    throw new Error("Folder berisi nama file atau jalur yang tidak valid.");
  }
  return { root: parts[0], path: relativeParts.join("/") };
}

async function analyzeFolder(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) throw new Error("Pilih folder yang berisi file mod terlebih dahulu.");
  if (!crypto.subtle) throw new Error("Browser ini tidak mendukung analisis SHA-256. Buka situs melalui koneksi aman (HTTPS).");

  const seenPaths = new Set();
  const analyzedFiles = [];
  let totalSize = 0;
  let folderName = "";
  const fingerprintParts = [];

  for (const file of files) {
    if (file.type.startsWith("video/") || /\.(?:3g2|3gp|avi|m4v|mkv|mov|mp4|mpeg|mpg|ogv|webm|wmv)$/i.test(file.name)) {
      throw new Error(`Folder berisi video yang tidak dapat diunggah: ${file.name}`);
    }

    const relativePath = getRelativePath(file);
    if (folderName && folderName !== relativePath.root) {
      throw new Error("Pilih satu folder mod saja dalam satu kali unggahan.");
    }
    folderName = relativePath.root;
    const path = relativePath.path;
    if (seenPaths.has(path)) throw new Error(`Folder berisi jalur file duplikat: ${path}`);
    seenPaths.add(path);

    const result = await analyzeFile(file);
    analyzedFiles.push({ path, file, sha256: result.sha256 });
    totalSize += file.size;
    fingerprintParts.push(`${path}\0${result.sha256}\0`);
  }

  const folderDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprintParts.sort().join("")));
  const sha256 = Array.from(new Uint8Array(folderDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    files: analyzedFiles,
    count: analyzedFiles.length,
    totalSize,
    sha256,
    folderName
  };
}

function showAnalysis(folder) {
  analysisPanel.classList.remove("analysis-error");
  analysisPanel.innerHTML = `
    <strong>Analisis folder berhasil</strong>
    <span>Folder: ${escapeHtml(folder.folderName)} · ${folder.count} file · ${formatSize(folder.totalSize)}</span>
    <span>SHA-256 folder: <code>${folder.sha256}</code></span>
    <span class="analysis-warning">Pemeriksaan ini hanya memvalidasi beberapa signature dan sidik jari, bukan memindai malware. Mod bisa menjalankan kode; jangan pasang folder yang tidak dipercaya.</span>
  `;
  analysisPanel.hidden = false;
}

function showAnalysisError(message) {
  analysisPanel.classList.add("analysis-error");
  analysisPanel.textContent = message;
  analysisPanel.hidden = false;
}

function createDownload(file, filename) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const crc32Table = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

async function calculateCrc32(file) {
  const reader = file.stream().getReader();
  let crc = 0xffffffff;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const byte of value) crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipHeader(signature, byteLength) {
  const header = new Uint8Array(byteLength);
  new DataView(header.buffer).setUint32(0, signature, true);
  return header;
}

async function createZip(files) {
  if (files.length > 0xffff) throw new Error("Folder berisi terlalu banyak file untuk format ZIP standar.");
  if (typeof CompressionStream === "undefined") throw new Error("Browser ini tidak mendukung pembuatan ZIP. Coba browser versi terbaru.");

  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of files) {
    if (entry.file.size > 0xffffffff || localOffset > 0xffffffff) {
      throw new Error("Folder terlalu besar untuk format ZIP standar di browser ini.");
    }
    const filename = encoder.encode(entry.path);
    if (filename.length > 0xffff) throw new Error(`Nama file terlalu panjang untuk ZIP: ${entry.path}`);
    const crc = await calculateCrc32(entry.file);
    const compressedReader = entry.file.stream().pipeThrough(new CompressionStream("deflate-raw")).getReader();
    const compressedChunks = [];
    let compressedSize = 0;
    while (true) {
      const { done, value } = await compressedReader.read();
      if (done) break;
      compressedSize += value.length;
      if (compressedSize > 0xffffffff) throw new Error("File terlalu besar untuk format ZIP standar di browser ini.");
      compressedChunks.push(value);
    }

    const localHeader = createZipHeader(0x04034b50, 30 + filename.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 8, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, compressedSize, true);
    localView.setUint32(22, entry.file.size, true);
    localView.setUint16(26, filename.length, true);
    localHeader.set(filename, 30);
    localParts.push(localHeader, ...compressedChunks);

    const centralHeader = createZipHeader(0x02014b50, 46 + filename.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 8, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, compressedSize, true);
    centralView.setUint32(24, entry.file.size, true);
    centralView.setUint16(28, filename.length, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(filename, 46);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + compressedSize;
    if (localOffset > 0xffffffff) throw new Error("Folder terlalu besar untuk format ZIP standar di browser ini.");
  }

  const centralDirectory = new Blob(centralParts);
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  if (centralSize > 0xffffffff) throw new Error("Daftar isi folder terlalu besar untuk format ZIP standar.");
  const endRecord = createZipHeader(0x06054b50, 22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  return new Blob([...localParts, centralDirectory, endRecord], { type: "application/zip" });
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").trim() || "mod";
}

async function downloadUploadedMod(id) {
  try {
    const mod = await getUploadedMod(id);
    if (!mod) throw new Error("Mod tidak ditemukan di penyimpanan browser ini.");
    if (Array.isArray(mod.files)) {
      const zip = await createZip(mod.files);
      createDownload(zip, `${sanitizeFilename(mod.name)}.zip`);
    } else if (mod.file) {
      createDownload(mod.file, mod.file.name);
    } else {
      throw new Error("File mod tidak ditemukan di penyimpanan browser ini.");
    }
  } catch (error) {
    uploadStatus.textContent = `Unduhan gagal: ${error.message}`;
  }
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderFilters();
  renderMods();
});

searchInput.addEventListener("input", renderMods);

createFirstModButton.addEventListener("click", () => {
  const categorySelect = uploadForm.elements.namedItem("category");
  if (activeCategory !== "Semua") categorySelect.value = activeCategory;
  document.querySelector("#bagikan").scrollIntoView({ behavior: "smooth" });
  uploadForm.elements.namedItem("name").focus({ preventScroll: true });
});

grid.addEventListener("click", (event) => {
  const downloadButton = event.target.closest("[data-download-id]");
  if (downloadButton) {
    downloadUploadedMod(downloadButton.dataset.downloadId);
    return;
  }
  const button = event.target.closest("[data-details]");
  if (!button) return;
  const mod = mods.find((item) => item.id === button.dataset.details);
  if (mod) showDetails(mod);
});

document.querySelector("#dialog-download").addEventListener("click", (event) => {
  const link = event.currentTarget;
  if (!link.dataset.downloadId) return;
  event.preventDefault();
  downloadUploadedMod(link.dataset.downloadId);
});

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

folderInput.addEventListener("change", () => {
  analyzedFolder = null;
  publishButton.disabled = true;
  analysisPanel.hidden = true;
  uploadStatus.textContent = "";
  const files = Array.from(folderInput.files);
  const folderName = files.length
    ? (files[0].webkitRelativePath || files[0].name).replace(/\\/g, "/").split("/")[0]
    : "";
  folderSelection.textContent = files.length
    ? `${folderName} · ${files.length} file`
    : "Belum ada folder yang dipilih.";
});

chooseFolderButton.addEventListener("click", () => folderInput.click());

analyzeButton.addEventListener("click", async () => {
  const files = Array.from(folderInput.files);
  analyzedFolder = null;
  publishButton.disabled = true;
  if (!files.length) {
    showAnalysisError("Pilih folder mod terlebih dahulu.");
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.textContent = "Menganalisis folder...";
  try {
    const result = await analyzeFolder(files);
    const duplicate = mods.some((mod) => mod.sha256 === result.sha256);
    if (duplicate) throw new Error("Folder dengan isi yang sama sudah ada di katalog browser ini.");
    analyzedFolder = result;
    showAnalysis(result);
    publishButton.disabled = !storageReady;
    if (!storageReady) uploadStatus.textContent = "Penyimpanan browser tidak tersedia; mod belum bisa ditambahkan.";
  } catch (error) {
    showAnalysisError(error.message);
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analisis folder";
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedFiles = Array.from(folderInput.files);
  if (!storageReady || !analyzedFolder || analyzedFolder.files.length !== selectedFiles.length
      || analyzedFolder.files.some((entry, index) => entry.file !== selectedFiles[index])) {
    uploadStatus.textContent = "Pilih dan analisis folder sebelum menambahkannya.";
    publishButton.disabled = true;
    return;
  }

  publishButton.disabled = true;
  uploadStatus.textContent = "Menyimpan mod di browser ini...";
  const formData = new FormData(uploadForm);
  const category = formData.get("category");
  const [background, color, symbol] = palettes[category] || palettes.Lainnya;
  const mod = {
    id: `community-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileId: "",
    name: formData.get("name").trim(),
    author: formData.get("author").trim(),
    category,
    description: formData.get("description").trim(),
    version: formData.get("version").trim(),
    size: formatSize(analyzedFolder.totalSize),
    symbol,
    background,
    color,
    sha256: analyzedFolder.sha256,
    files: analyzedFolder.files.map(({ path, file }) => ({ path, file }))
  };
  mod.fileId = mod.id;

  try {
    await saveUploadedMod(mod);
    mods.push(mod);
    renderFilters();
    renderMods();
    uploadForm.reset();
    analyzedFolder = null;
    folderSelection.textContent = "Belum ada folder yang dipilih.";
    analysisPanel.hidden = true;
    uploadStatus.textContent = "Mod berhasil ditambahkan ke katalog lokal. Mod ini hanya terlihat di browser dan perangkat ini.";
  } catch (error) {
    uploadStatus.textContent = `Mod gagal disimpan: ${error.message}`;
    publishButton.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

async function initialize() {
  renderFilters();
  renderMods();
  try {
    database = await openDatabase();
    const uploadedMods = await getUploadedMods();
    mods.push(...uploadedMods);
    storageReady = true;
    renderFilters();
    renderMods();
  } catch (error) {
    uploadStatus.textContent = `Penyimpanan lokal tidak tersedia: ${error.message}`;
    analyzeButton.disabled = true;
  }
}

initialize();
