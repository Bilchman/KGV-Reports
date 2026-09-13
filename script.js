// ---------------------------------------------------------------------
// Розгортає/згортає блок коду
// ---------------------------------------------------------------------
function toggleCode(header) {
    const block = header.parentElement;
    block.classList.toggle('open');
}

// ---------------------------------------------------------------------
// Перемикання між лабораторними
// ---------------------------------------------------------------------
function openLab(labId, titleEl) {
    document.querySelectorAll('.lab-section').forEach((sec) => sec.classList.remove('active'));
    document.querySelectorAll('.submenu-wrap').forEach((w) => w.classList.remove('open'));
    document.querySelectorAll('.lab-title').forEach((t) => t.classList.remove('active'));

    document.getElementById(labId).classList.add('active');
    titleEl.classList.add('active');
    titleEl.nextElementSibling.classList.add('open');

    const content = document.getElementById('content');
    if (content) content.scrollTop = 0;
}

// ---------------------------------------------------------------------
// Налаштування GitHub репозиторію
// ---------------------------------------------------------------------
const CONFIG = {
    owner: "Bilchman",
    repo: "KGV-Reports",
    branch: "main",
    path: "reports",
};

const IGNORED_FILES = new Set(["template.html", "_template.html", "readme.md", ".gitkeep"]);

const navEl = document.getElementById("lab-nav");
const contentEl = document.getElementById("content");

if (navEl && contentEl) {
    // Очищаємо залишки старого кешу в браузері один раз
    localStorage.clear();
    init();
}

async function init() {
    try {
        const files = await getReportFiles();
        render(files);
    } catch (err) {
        navEl.innerHTML = `<p class="state-message">${escapeHtml(err.message)}</p>`;
    }
}

async function getReportFiles() {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}`;
    const res = await fetch(url, { 
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store" // Забороняє браузеру кешувати відповідь
    });

    if (!res.ok) {
        throw new Error(
            res.status === 403
                ? "GitHub тимчасово обмежив кількість запитів. Спробуйте за кілька хвилин."
                : `Не вдалося завантажити список звітів (HTTP ${res.status}).`
        );
    }

    const entries = await res.json();
    const candidates = entries
        .filter((e) => e.type === "file")
        .filter((e) => !IGNORED_FILES.has(e.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return await Promise.all(candidates.map(describeFile));
}

async function describeFile(entry) {
    const ext = entry.name.split(".").pop().toLowerCase();
    const isHtml = ext === "html" || ext === "htm";
    const base = {
        name: entry.name,
        slug: slugify(entry.name),
        href: `${CONFIG.path}/${encodeURIComponent(entry.name)}`,
        isHtml,
        title: entry.name,
        contentHtml: "",
    };

    if (!isHtml) return base;

    try {
        const res = await fetch(entry.download_url, { cache: "no-store" });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const metaTitle = doc.querySelector('meta[name="report-title"]')?.content;
        const contentNode = doc.querySelector(".content");
        base.title = metaTitle || doc.querySelector("title")?.textContent || entry.name;
        base.contentHtml = contentNode ? contentNode.innerHTML : "<p>Не вдалося прочитати вміст звіту.</p>";
    } catch {
        base.contentHtml = "<p>Не вдалося прочитати вміст звіту.</p>";
    }
    return base;
}

function slugify(filename) {
    return filename
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const SECTIONS = [
    ["meta", "Мета"],
    ["condition", "Умова"],
    ["analysis", "Аналіз"],
    ["diagram", "Діаграма класів"],
    ["code", "Код"],
    ["examples", "Приклади"],
    ["tests", "Перевірки"],
    ["conclusion", "Висновки"],
];

function render(files) {
    if (files.length === 0) {
        navEl.innerHTML = `<p class="state-message">Звітів поки немає.</p>`;
        return;
    }

    navEl.innerHTML = "";
    contentEl.innerHTML = "";

    files.forEach((f) => {
        if (!f.isHtml) {
            navEl.insertAdjacentHTML(
                "beforeend",
                `<a class="lab-title" style="display:block;text-decoration:none;"
                    href="${f.href}" target="_blank" rel="noopener">${escapeHtml(f.title)}</a>`
            );
            return;
        }

        const menuItems = SECTIONS.map(
            ([id, label]) => `<li><a href="#${f.slug}-${id}">${label}</a></li>`
        ).join("");

        navEl.insertAdjacentHTML(
            "beforeend",
            `<div class="lab-title" onclick="openLab('${f.slug}', this)">${escapeHtml(f.title)}</div>
             <div class="submenu-wrap">
                <ul class="submenu">${menuItems}</ul>
             </div>`
        );

        const temp = document.createElement("div");
        temp.innerHTML = f.contentHtml;
        
        temp.querySelectorAll("article[id]").forEach((art) => {
            art.id = `${f.slug}-${art.id}`;
        });

        // Автоматично прибирає зайвий "/" на початку шляхів (для коректної роботи на GitHub Pages)
        temp.querySelectorAll("img, video, source").forEach((el) => {
            const src = el.getAttribute("src");
            if (src && src.startsWith("/")) {
                el.setAttribute("src", src.replace(/^\/+/, ""));
            }
        });

        contentEl.insertAdjacentHTML(
            "beforeend",
            `<section id="${f.slug}" class="lab-section">${temp.innerHTML}</section>`
        );
    });

    document.querySelector(".lab-title")?.click();
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}
