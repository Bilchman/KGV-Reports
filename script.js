// ---------------------------------------------------------------------
// Used on EVERY page (index + each report) via <script src="script.js">
// or <script src="../script.js">.
// ---------------------------------------------------------------------

// Розгортає/згортає блок коду — та сама логіка, що й раніше.
function toggleCode(header) {
    const block = header.parentElement;
    block.classList.toggle('open');
}

// ---------------------------------------------------------------------
// Все нижче виконується ТІЛЬКИ на головній сторінці (index.html),
// яка має контейнер <div id="report-list">. На сторінках самих
// звітів цього елемента немає, тож код нижче просто не запускається.
// ---------------------------------------------------------------------

const CONFIG = {
    owner: "Bilchman",
    repo: "KGV-Reports",
    branch: "main",
    path: "reports",
    cacheMinutes: 5,
};

const IGNORED_FILES = new Set(["_template.html", "readme.md", ".gitkeep"]);

const listEl = document.getElementById("report-list");
const frameEl = document.getElementById("report-frame");

if (listEl) {
    initIndex();
}

async function initIndex() {
    try {
        const files = await getReportFiles();
        renderList(files);
        if (files.length > 0) {
            selectReport(files[0], document.querySelector(".report-list-item"));
        }
    } catch (err) {
        listEl.innerHTML = `<li class="state-message">${escapeHtml(err.message)}</li>`;
    }
}

async function getReportFiles() {
    const cacheKey = `reports-cache:${CONFIG.owner}/${CONFIG.repo}/${CONFIG.path}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}`;
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });

    if (!res.ok) {
        throw new Error(
            res.status === 403
                ? "GitHub тимчасово обмежив кількість запитів. Спробуйте за кілька хвилин."
                : `Не вдалося завантажити список звітів (HTTP ${res.status}).`
        );
    }

    const entries = await res.json();
    const htmlFiles = entries
        .filter((e) => e.type === "file")
        .filter((e) => !IGNORED_FILES.has(e.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Для .html/.htm файлів підтягуємо справжній заголовок/підзаголовок
    // зі сторінки (meta report-title / report-subtitle), щоб не залежати
    // від назви файлу. Інші типи файлів (якщо колись додасте) показуються
    // просто за назвою файлу.
    const files = await Promise.all(htmlFiles.map(describeFile));

    writeCache(cacheKey, files);
    return files;
}

async function describeFile(entry) {
    const ext = entry.name.split(".").pop().toLowerCase();
    const base = {
        name: entry.name,
        href: `${CONFIG.path}/${encodeURIComponent(entry.name)}`,
        isHtml: ext === "html" || ext === "htm",
        title: entry.name,
        subtitle: "",
    };

    if (!base.isHtml) return base;

    try {
        const res = await fetch(entry.download_url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const metaTitle = doc.querySelector('meta[name="report-title"]')?.content;
        const metaSubtitle = doc.querySelector('meta[name="report-subtitle"]')?.content;
        base.title = metaTitle || doc.querySelector("title")?.textContent || entry.name;
        base.subtitle = metaSubtitle || "";
    } catch {
        // якщо не вдалось прочитати — просто покажемо назву файлу
    }
    return base;
}

function renderList(files) {
    if (files.length === 0) {
        listEl.innerHTML = `<li class="state-message">Звітів поки немає.</li>`;
        return;
    }

    listEl.innerHTML = "";
    files.forEach((f) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "report-list-item";
        a.href = f.href;
        a.innerHTML = `
            <span class="title">${escapeHtml(f.title)}</span>
            ${f.subtitle ? `<span class="subtitle">${escapeHtml(f.subtitle)}</span>` : ""}
        `;
        a.addEventListener("click", (ev) => {
            if (f.isHtml) {
                ev.preventDefault();
                selectReport(f, a);
            }
            // не-HTML файли (наприклад PDF) відкриються звичайним посиланням
        });
        li.appendChild(a);
        listEl.appendChild(li);
    });
}

function selectReport(file, linkEl) {
    if (!file.isHtml) return;
    frameEl.src = file.href;
    document
        .querySelectorAll(".report-list-item")
        .forEach((el) => el.classList.remove("active"));
    if (linkEl) linkEl.classList.add("active");
}

function readCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { savedAt, files } = JSON.parse(raw);
        if (Date.now() - savedAt > CONFIG.cacheMinutes * 60 * 1000) return null;
        return files;
    } catch {
        return null;
    }
}

function writeCache(key, files) {
    try {
        localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), files }));
    } catch {
        // сховище недоступне (наприклад, приватний режим) — просто пропускаємо кеш
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}
