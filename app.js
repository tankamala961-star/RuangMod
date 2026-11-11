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
    category: "Vehicle",
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
    id: "samp-voice-pack",
    name: "SA-MP Voice Pack",
    category: "Voice pack",
    description: "Paket suara komunitas untuk menambah variasi audio saat bermain SA-MP. Baca petunjuk pemasangan dan pastikan kompatibel dengan client yang digunakan.",
    version: "v1.0",
    size: "Belum tersedia",
    symbol: "🎙",
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

const fileSignatures = {
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  bmp: [[0x42, 0x4d]]
};
const riskyFileExtensions = new Set([
  "asi", "dll", "cs", "lua", "cleo", "exe", "msi", "msp", "com", "scr",
  "bat", "cmd", "ps1", "vbs", "vbe", "jse", "wsf", "wsh", "hta", "js",
  "mjs", "cjs", "html", "htm", "xhtml", "svg", "url", "lnk", "website",
  "webloc", "reg", "sh", "bash", "zsh", "jar", "appx", "msix", "zip",
  "rar", "7z"
]);
const palettes = {
  Visual: ["#2b3123", "#d0f66d", "V"],
  UI: ["#252d32", "#a9d9e5", "⌗"],
  Tools: ["#332a22", "#f4b77a", "⌁"],
  Audio: ["#32252c", "#efa8c5", "♫"],
  "Voice pack": ["#30252d", "#e7a5d2", "🎙"],
  Vehicle: ["#292d24", "#c5e777", "V"],
  Gameplay: ["#30272b", "#f1a6a6", "G"],
};
const collectionGrid = document.querySelector("#collection-grid");
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
const previewInput = document.querySelector("#upload-preview");
const chooseFolderButton = document.querySelector("#choose-folder-button");
const folderSelection = document.querySelector("#folder-selection");
const previewThumbnail = document.querySelector("#preview-thumbnail");
const codeAcknowledgement = document.querySelector("#code-acknowledgement");
const trustedCodeInput = document.querySelector("#trusted-code");
const analysisPanel = document.querySelector("#analysis-result");
const analyzeButton = document.querySelector("#analyze-button");
const publishButton = document.querySelector("#publish-button");
const uploadStatus = document.querySelector("#upload-status");
const authForm = document.querySelector("#auth-form");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authStatus = document.querySelector("#auth-status");
const signInButton = document.querySelector("#sign-in-button");
const signUpButton = document.querySelector("#sign-up-button");
const signOutButton = document.querySelector("#sign-out-button");
const googleSignInButton = document.querySelector("#google-sign-in-button");
let mods = [...initialMods];
let activeCategory = "Semua";
let analyzedFolder = null;
let previewSelectionUrl = "";
let storageReady = false;
let currentUser = null;
let supabaseClient;
const previewUrls = new Map();
const maxUploadBytes = 100 * 1024 * 1024;
const supabaseConfig = window.RUANGMOD_SUPABASE;

function updateAuthInterface() {
  const signedIn = Boolean(currentUser);
  authEmail.disabled = signedIn;
  authPassword.disabled = signedIn;
  signInButton.hidden = signedIn;
  signUpButton.hidden = signedIn;
  signOutButton.hidden = !signedIn;
  googleSignInButton.hidden = signedIn;
  authStatus.textContent = signedIn ? "Akun aktif." : "Masuk atau daftar untuk mengunggah mod.";
  publishButton.disabled = !storageReady || !currentUser || !analyzedFolder
    || (analyzedFolder.riskyFiles.length > 0 && !trustedCodeInput.checked);
}

function addCommunityMod(mod) {
  mods = [mod, ...mods.filter((existing) => existing.id !== mod.id)];
  renderFilters();
  renderMods();
}

function toCommunityMod(row) {
  const bucket = supabaseClient.storage.from(supabaseConfig.bucket);
  const [background, color, symbol] = palettes[row.category] || palettes.Gameplay;
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    category: row.category,
    description: row.description,
    version: row.version,
    size: formatSize(row.size_bytes),
    symbol,
    background,
    color,
    sha256: row.sha256,
    archivePath: row.archive_path,
    downloadUrl: bucket.getPublicUrl(row.archive_path).data.publicUrl,
    preview: row.preview_path ? bucket.getPublicUrl(row.preview_path).data.publicUrl : "",
    createdAt: row.created_at
  };
}

async function refreshCommunityMods() {
  const { data, error } = await supabaseClient
    .from("mods")
    .select("id,name,author,category,description,version,size_bytes,sha256,archive_path,preview_path,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const communityMods = data.map(toCommunityMod);
  const initialIds = new Set(initialMods.map((mod) => mod.id));
  mods = [...initialMods, ...communityMods.filter((mod) => !initialIds.has(mod.id))];
  renderFilters();
  renderMods();
}

function getErrorMessage(error) {
  return error?.message || "Terjadi kesalahan yang tidak diketahui.";
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

function sanitizeUserText(value) {
  return String(value)
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
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

function getPreviewUrl(mod) {
  if (!mod.preview) return "";
  if (typeof mod.preview === "string") return mod.preview;
  const cached = previewUrls.get(mod.id);
  if (cached && cached.file === mod.preview) return cached.url;
  if (cached) URL.revokeObjectURL(cached.url);
  const url = URL.createObjectURL(mod.preview);
  previewUrls.set(mod.id, { file: mod.preview, url });
  return url;
}

function renderMods() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  if (activeCategory === "Semua" && !query) {
    const visibleCategories = Object.keys(palettes).filter((category) => category.toLocaleLowerCase("id").includes(query));
    collectionGrid.innerHTML = visibleCategories.map((category) => {
      const [background, color, symbol] = palettes[category];
      const modCount = mods.filter((mod) => mod.category === category).length;
      return `
        <article class="mod-card collection-card">
          <div class="card-art" style="--card-bg:${background};--card-color:${color}">
            <span class="card-symbol" aria-hidden="true">${escapeHtml(symbol)}</span>
          </div>
          <div class="card-body">
            <div class="card-topline">
              <span class="category-tag">KOLEKSI MOD</span>
              <span class="folder-tag">${modCount} MOD</span>
            </div>
            <h3>${escapeHtml(category)}</h3>
            <p>Kumpulan mod kategori ${escapeHtml(category)}.</p>
            <div class="card-actions">
              <button class="details-button" type="button" data-open-category="${escapeHtml(category)}">Buka koleksi ↗</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
    grid.innerHTML = "";

    resultsCount.textContent = `${visibleCategories.length} KOLEKSI DITEMUKAN`;
    emptyState.hidden = visibleCategories.length > 0;
    collectionGrid.hidden = visibleCategories.length === 0;
    grid.hidden = true;
    emptyStateIcon.textContent = "⌕";
    emptyStateTitle.textContent = "Koleksi tidak ditemukan.";
    emptyStateDescription.textContent = "Coba kata kunci koleksi lain.";
    createFirstModButton.hidden = true;
    return;
  }

  collectionGrid.innerHTML = "";
  collectionGrid.hidden = true;
  const visibleMods = mods.filter((mod) => {
    const matchesCategory = activeCategory === "Semua" || mod.category === activeCategory;
    const searchableText = `${mod.name} ${mod.category} ${mod.description} ${mod.author || ""}`.toLocaleLowerCase("id");
    return matchesCategory && searchableText.includes(query);
  });

  grid.innerHTML = visibleMods.map((mod) => {
    const [background, color, symbol] = palettes[mod.category] || palettes.Gameplay;
    const openLabel = mod.archivePath ? "Buka folder ↗" : "Buka ↗";
    return `
      <article class="mod-card${mod.archivePath ? " mod-card-folder" : ""}">
        <div class="card-art" style="--card-bg:${background};--card-color:${color}">
          ${mod.preview
            ? `<img class="card-preview" src="${getPreviewUrl(mod)}" alt="Preview ${escapeHtml(mod.name)}" loading="lazy">`
            : `<span class="card-symbol" aria-hidden="true">${escapeHtml(mod.symbol || symbol)}</span>`}
        </div>
        <div class="card-body">
          <div class="card-topline">
            <span class="category-tag">${escapeHtml(mod.category)}</span>
            ${mod.archivePath ? '<span class="folder-tag">▰ FOLDER MOD</span>' : ""}
          </div>
          <h3>${escapeHtml(mod.name)}</h3>
          <p>${escapeHtml(mod.description)}</p>
          ${mod.author ? `<p class="card-author">Dibagikan oleh ${escapeHtml(mod.author)}</p>` : ""}
          <div class="card-actions">
            <button class="details-button" type="button" data-details="${escapeHtml(mod.id)}">${openLabel}</button>
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
  document.querySelector("#dialog-version").textContent = `Versi: ${mod.version}`;
  const author = document.querySelector("#dialog-author");
  author.hidden = !mod.author;
  author.textContent = mod.author ? `Pembuat: ${mod.author}` : "";
  const preview = document.querySelector("#dialog-preview");
  preview.hidden = !mod.preview;
  if (mod.preview) {
    preview.src = getPreviewUrl(mod);
    preview.alt = `Preview ${mod.name}`;
  } else {
    preview.removeAttribute("src");
    preview.alt = "";
  }

  const downloadLink = document.querySelector("#dialog-download");
  const downloadNote = document.querySelector("#dialog-download-note");
  const unavailableNote = document.querySelector("#dialog-unavailable");
  const safeDownloadUrl = getSafeDownloadUrl(mod.downloadUrl);
  downloadLink.hidden = !safeDownloadUrl;
  unavailableNote.hidden = Boolean(safeDownloadUrl);
  downloadNote.hidden = !mod.archivePath;
  downloadLink.href = safeDownloadUrl || "#";
  if (safeDownloadUrl) downloadLink.setAttribute("download", "");
  else downloadLink.removeAttribute("download");
  dialog.showModal();
}

function getSafeDownloadUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value);
    const trustedOrigin = new URL(supabaseConfig.url).origin;
    if (url.username || url.password || url.origin !== trustedOrigin || url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function matchesSignature(bytes, signatures) {
  return signatures.some((signature) => signature.every((byte, index) => bytes[index] === byte));
}

async function analyzeFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (!crypto.subtle) throw new Error("Browser ini tidak mendukung analisis SHA-256. Buka situs melalui koneksi aman (HTTPS).");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { extension, sha256 };
}

async function validatePreview(file) {
  if (!file) return;
  const extension = file.name.split(".").pop().toLowerCase();
  const signature = fileSignatures[extension];
  if (!["png", "jpg", "jpeg", "webp"].includes(extension) || file.type.startsWith("video/")) {
    throw new Error("Preview harus berupa gambar PNG, JPG, atau WEBP.");
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validSignature = extension === "webp"
    ? matchesSignature(header, [[0x52, 0x49, 0x46, 0x46]])
      && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
    : signature && matchesSignature(header, signature);
  if (!validSignature) throw new Error("Isi gambar preview tidak cocok dengan format nama filenya.");

  if (typeof createImageBitmap !== "function") {
    throw new Error("Browser ini tidak mendukung pemeriksaan gambar preview. Coba browser versi terbaru.");
  }
  const bitmap = await createImageBitmap(file);
  bitmap.close();
}

function getRelativePath(file) {
  const rawPath = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
  if (rawPath.startsWith("/") || /^[a-z]:/i.test(rawPath)) {
    throw new Error("Folder berisi jalur file yang tidak valid.");
  }
  const parts = rawPath.split("/");
  if (parts.some((part) => !part || part === "." || part === ".."
      || /[<>:"|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(part) || /[. ]$/.test(part)
      || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error("Folder berisi nama file atau jalur yang tidak valid.");
  }
  const relativeParts = parts.length > 1 ? parts.slice(1) : parts;
  if (!relativeParts.length) {
    throw new Error("Folder berisi nama file atau jalur yang tidak valid.");
  }
  return { root: parts[0], path: relativeParts.join("/") };
}

async function analyzeFolder(fileList, previewFile) {
  const files = Array.from(fileList);
  if (files.length === 0) throw new Error("Pilih folder yang berisi file mod terlebih dahulu.");
  if (!crypto.subtle) throw new Error("Browser ini tidak mendukung analisis SHA-256. Buka situs melalui koneksi aman (HTTPS).");
  await validatePreview(previewFile);

  const seenPaths = new Set();
  const analyzedFiles = [];
  const riskyFiles = [];
  let totalSize = 0;
  let folderName = "";
  const fingerprintParts = [];

  for (const file of files) {
    if (file.type.startsWith("video/") || /\.(?:3g2|3gp|avi|m4v|mkv|mov|mp4|mpeg|mpg|ogv|webm|wmv)$/i.test(file.name)) {
      throw new Error(`Folder berisi video yang tidak dapat diunggah: ${file.name}`);
    }
    const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";

    const relativePath = getRelativePath(file);
    if (folderName && folderName !== relativePath.root) {
      throw new Error("Pilih satu folder mod saja dalam satu kali unggahan.");
    }
    folderName = relativePath.root;
    const path = relativePath.path;
    const normalizedPath = path.toLocaleLowerCase("en-US");
    if (seenPaths.has(normalizedPath)) throw new Error(`Folder berisi jalur file duplikat: ${path}`);
    seenPaths.add(normalizedPath);

    const result = await analyzeFile(file);
    analyzedFiles.push({ path, file, sha256: result.sha256 });
    if (riskyFileExtensions.has(extension)) riskyFiles.push(path);
    totalSize += file.size;
    if (totalSize > maxUploadBytes) {
      throw new Error(`Ukuran folder melebihi batas ${formatSize(maxUploadBytes)}.`);
    }
    fingerprintParts.push(`${path}\0${result.sha256}\0`);
  }

  const folderDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprintParts.sort().join("")));
  const sha256 = Array.from(new Uint8Array(folderDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    files: analyzedFiles,
    riskyFiles,
    count: analyzedFiles.length,
    totalSize,
    sha256,
    folderName,
    previewFile
  };
}

function showAnalysis(folder) {
  analysisPanel.classList.remove("analysis-error");
  analysisPanel.innerHTML = `
    <strong>Analisis folder berhasil</strong>
    <span>Folder: ${escapeHtml(folder.folderName)} · ${folder.count} file · ${formatSize(folder.totalSize)}</span>
    <span>SHA-256 folder: <code>${folder.sha256}</code></span>
    ${folder.riskyFiles.length
      ? `<span class="analysis-warning">Ditemukan file atau arsip yang dapat menjalankan kode atau memuat konten aktif: ${folder.riskyFiles.map(escapeHtml).join(", ")}. Situs menyimpan file tanpa menjalankannya dan tidak memindai isi seperti antivirus. Verifikasi sumber sebelum mengunduh atau membuka hasilnya.</span>`
      : ""}
    <span class="analysis-warning">Pemeriksaan browser bukan antivirus. Jangan jalankan mod atau ikuti tautan dari sumber yang tidak dipercaya.</span>
  `;
  analysisPanel.hidden = false;
  trustedCodeInput.checked = false;
  codeAcknowledgement.hidden = folder.riskyFiles.length === 0;
  publishButton.disabled = !storageReady || !currentUser || folder.riskyFiles.length > 0;
}

function showAnalysisError(message) {
  analysisPanel.classList.add("analysis-error");
  analysisPanel.textContent = message;
  analysisPanel.hidden = false;
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

async function createZip(files, rootFolder) {
  if (files.length > 0xffff) throw new Error("Folder berisi terlalu banyak file untuk format ZIP standar.");
  if (typeof CompressionStream === "undefined") throw new Error("Browser ini tidak mendukung pembuatan ZIP. Coba browser versi terbaru.");

  const encoder = new TextEncoder();
  const zipRoot = rootFolder ? `${sanitizeFilename(rootFolder)}/` : "";
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
    const archivePath = `${zipRoot}${entry.path}`;
    const filename = encoder.encode(archivePath);
    if (filename.length > 0xffff) throw new Error(`Nama file terlalu panjang untuk ZIP: ${archivePath}`);
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

collectionGrid.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-open-category]");
  if (categoryButton) {
    activeCategory = categoryButton.dataset.openCategory;
    searchInput.value = "";
    renderFilters();
    renderMods();
  }
});

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-details]");
  if (!button) return;
  const mod = mods.find((item) => item.id === button.dataset.details);
  if (mod) showDetails(mod);
});

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

folderInput.addEventListener("change", () => {
  analyzedFolder = null;
  publishButton.disabled = true;
  analysisPanel.hidden = true;
  codeAcknowledgement.hidden = true;
  trustedCodeInput.checked = false;
  uploadStatus.textContent = "";
  const files = Array.from(folderInput.files);
  const folderName = files.length
    ? (files[0].webkitRelativePath || files[0].name).replace(/\\/g, "/").split("/")[0]
    : "";
  folderSelection.textContent = files.length
    ? `${folderName} · ${files.length} file`
    : "Belum ada folder yang dipilih.";
});

previewInput.addEventListener("change", async () => {
  analyzedFolder = null;
  publishButton.disabled = true;
  analysisPanel.hidden = true;
  codeAcknowledgement.hidden = true;
  trustedCodeInput.checked = false;
  const file = previewInput.files[0];
  if (previewSelectionUrl) URL.revokeObjectURL(previewSelectionUrl);
  previewSelectionUrl = "";
  previewThumbnail.hidden = true;
  previewThumbnail.removeAttribute("src");
  if (!file) return;

  try {
    await validatePreview(file);
    previewSelectionUrl = URL.createObjectURL(file);
    previewThumbnail.src = previewSelectionUrl;
    previewThumbnail.hidden = false;
  } catch (error) {
    showAnalysisError(error.message);
    previewInput.value = "";
  }
});

trustedCodeInput.addEventListener("change", () => {
  publishButton.disabled = !storageReady || !currentUser || !analyzedFolder
    || (analyzedFolder.riskyFiles.length > 0 && !trustedCodeInput.checked);
});

chooseFolderButton.addEventListener("click", () => folderInput.click());

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await authenticate("signInWithPassword");
});

signUpButton.addEventListener("click", async () => {
  if (!authForm.reportValidity()) return;
  await authenticate("signUp");
});

googleSignInButton.addEventListener("click", async () => {
  if (!supabaseClient) {
    authStatus.textContent = "Koneksi Supabase belum siap. Muat ulang halaman atau periksa konfigurasi.";
    return;
  }
  googleSignInButton.disabled = true;
  authStatus.textContent = "Mengalihkan ke Google untuk memilih akun...";
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}${location.pathname}`,
        queryParams: { prompt: "select_account" }
      }
    });
    if (error) throw error;
  } catch (error) {
    authStatus.textContent = `Login Google gagal: ${getErrorMessage(error)}`;
    googleSignInButton.disabled = false;
  }
});

async function authenticate(action) {
  if (!supabaseClient) {
    authStatus.textContent = "Koneksi Supabase belum siap. Muat ulang halaman atau periksa konfigurasi.";
    return;
  }
  signInButton.disabled = true;
  signUpButton.disabled = true;
  const credentials = { email: authEmail.value.trim(), password: authPassword.value };
  let feedback = "";
  try {
    const { data, error } = await supabaseClient.auth[action](credentials);
    if (error) throw error;
    currentUser = data.session ? data.user : null;
    authPassword.value = "";
    if (action === "signUp" && !data.session) {
      feedback = "Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.";
    }
  } catch (error) {
    feedback = `Autentikasi gagal: ${getErrorMessage(error)}`;
  } finally {
    signInButton.disabled = false;
    signUpButton.disabled = false;
    updateAuthInterface();
  }
  if (feedback) authStatus.textContent = feedback;
}

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    currentUser = null;
    updateAuthInterface();
  } catch (error) {
    authStatus.textContent = `Gagal keluar: ${getErrorMessage(error)}`;
  } finally {
    signOutButton.disabled = false;
  }
});

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
    const result = await analyzeFolder(files, previewInput.files[0] || null);
    const duplicate = mods.some((mod) => mod.sha256 === result.sha256);
    if (duplicate) throw new Error("Folder dengan isi yang sama sudah ada di katalog browser ini.");
    analyzedFolder = result;
    showAnalysis(result);
    if (!storageReady) uploadStatus.textContent = "Supabase belum siap; mod belum bisa diunggah.";
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
  if (!storageReady || !currentUser || !analyzedFolder || analyzedFolder.files.length !== selectedFiles.length
      || analyzedFolder.files.some((entry, index) => entry.file !== selectedFiles[index])
      || analyzedFolder.previewFile !== (previewInput.files[0] || null)
      || (analyzedFolder.riskyFiles.length > 0 && !trustedCodeInput.checked)) {
    uploadStatus.textContent = !currentUser
      ? "Masuk ke akun terlebih dahulu untuk mengunggah."
      : "Pilih dan analisis folder sebelum menambahkannya.";
    if (analyzedFolder?.riskyFiles.length && !trustedCodeInput.checked) {
      uploadStatus.textContent = "Konfirmasi bahwa kamu percaya sumber file yang dapat menjalankan kode.";
    }
    publishButton.disabled = true;
    return;
  }

  publishButton.disabled = true;
  uploadStatus.textContent = "Membuat arsip dan mengunggah ke RuangMod...";
  const formData = new FormData(uploadForm);
  const category = formData.get("category");
  const name = sanitizeUserText(formData.get("name"));
  const author = sanitizeUserText(formData.get("author"));
  const description = sanitizeUserText(formData.get("description"));
  const version = sanitizeUserText(formData.get("version"));
  if (!name || !author || !description || !version) {
    uploadStatus.textContent = "Lengkapi nama mod, pembuat, versi, dan deskripsi dengan teks yang valid.";
    publishButton.disabled = false;
    return;
  }
  const modId = crypto.randomUUID();
  const archivePath = `${currentUser.id}/${modId}.zip`;
  const previewFile = analyzedFolder.previewFile;
  const previewPath = previewFile
    ? `${currentUser.id}/${modId}-preview.${previewFile.name.split(".").pop().toLowerCase()}`
    : null;
  const mod = {
    id: modId,
    user_id: currentUser.id,
    name,
    author,
    category,
    description,
    version,
    size_bytes: analyzedFolder.totalSize,
    sha256: analyzedFolder.sha256,
    archive_path: archivePath,
    preview_path: previewPath
  };
  const bucket = supabaseClient.storage.from(supabaseConfig.bucket);
  const uploadedPaths = [];
  let metadataSaved = false;

  try {
    const archive = await createZip(analyzedFolder.files, analyzedFolder.folderName);
    if (archive.size > maxUploadBytes) {
      throw new Error(`Arsip ZIP melebihi batas ${formatSize(maxUploadBytes)}.`);
    }
    const { error: archiveError } = await bucket.upload(archivePath, archive, {
      contentType: "application/zip",
      cacheControl: "3600",
      upsert: false
    });
    if (archiveError) throw archiveError;
    uploadedPaths.push(archivePath);

    if (previewFile && previewPath) {
      const { error: previewError } = await bucket.upload(previewPath, previewFile, {
        contentType: {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          webp: "image/webp"
        }[previewFile.name.split(".").pop().toLowerCase()],
        cacheControl: "3600",
        upsert: false
      });
      if (previewError) throw previewError;
      uploadedPaths.push(previewPath);
    }

    const { data, error: insertError } = await supabaseClient
      .from("mods")
      .insert(mod)
      .select("id,name,author,category,description,version,size_bytes,sha256,archive_path,preview_path,created_at")
      .single();
    if (insertError) throw insertError;
    metadataSaved = true;

    addCommunityMod(toCommunityMod(data));
    activeCategory = category;
    searchInput.value = "";
    renderFilters();
    renderMods();
    uploadForm.reset();
    analyzedFolder = null;
    folderSelection.textContent = "Belum ada folder yang dipilih.";
    trustedCodeInput.checked = false;
    codeAcknowledgement.hidden = true;
    if (previewSelectionUrl) URL.revokeObjectURL(previewSelectionUrl);
    previewSelectionUrl = "";
    previewThumbnail.hidden = true;
    previewThumbnail.removeAttribute("src");
    analysisPanel.hidden = true;
    uploadStatus.textContent = "Mod berhasil diterbitkan dan kini tersedia untuk semua pengunjung.";
    document.querySelector("#koleksi").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    let message = `Mod gagal diunggah: ${getErrorMessage(error)}`;
    if (metadataSaved) {
      message = `Mod sudah diterbitkan, tetapi tampilan gagal diperbarui: ${getErrorMessage(error)}`;
    } else if (uploadedPaths.length) {
      try {
        const { error: cleanupError } = await bucket.remove(uploadedPaths);
        if (cleanupError) message += ` File sementara gagal dibersihkan: ${getErrorMessage(cleanupError)}`;
      } catch (cleanupError) {
        message += ` File sementara gagal dibersihkan: ${getErrorMessage(cleanupError)}`;
      }
    }
    uploadStatus.textContent = message;
    updateAuthInterface();
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
    if (!supabaseConfig?.url || !supabaseConfig?.publishableKey || !window.supabase?.createClient) {
      throw new Error("Konfigurasi Supabase atau pustaka klien tidak ditemukan.");
    }
    supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey);
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    currentUser = sessionData.session?.user || null;
    updateAuthInterface();
    supabaseClient.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      updateAuthInterface();
    });
    await refreshCommunityMods();
    storageReady = true;
    updateAuthInterface();
    supabaseClient
      .channel("ruangmod-public-mods")
      .on("postgres_changes", { event: "*", schema: "public", table: "mods" }, () => {
        refreshCommunityMods().catch((error) => {
          authStatus.textContent = `Pembaruan koleksi gagal: ${getErrorMessage(error)}`;
        });
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          authStatus.textContent = `Pembaruan langsung tidak tersedia: ${getErrorMessage(error)}`;
        }
      });
    window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshCommunityMods().catch((error) => {
        authStatus.textContent = `Pembaruan koleksi gagal: ${getErrorMessage(error)}`;
      });
    }, 30_000);
  } catch (error) {
    updateAuthInterface();
    authStatus.textContent = `Koneksi Supabase gagal: ${getErrorMessage(error)}`;
    uploadStatus.textContent = "Periksa setup Supabase dan jalankan SQL pada file SUPABASE_SETUP.md.";
  }
}

initialize();
