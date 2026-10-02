// ---------------------------------------------------------------------
// Список ваших лабораторних робіт.
// Коли зробите Лабу №2 — просто розкоментуйте або допишіть рядок нижче!
// ---------------------------------------------------------------------
const REPORTS = [
    { id: "01lab", title: "Лабораторна робота №1", file: "reports/01lab.html" },
    { id: "02lab", title: "Лабораторна робота №2", file: "reports/02lab.html" },
    // { id: "03lab", title: "Лабораторна робота №3", file: "reports/03lab.html" },
];

const SECTIONS = [
    ["meta", "Мета"],
    ["condition", "Умова"],
    ["analysis", "Хід роботи"],
    ["code", "Код"],
    ["examples", "Приклади"],
    ["tests", "Перевірки"],
    ["conclusion", "Висновки"],
];

// Розгортання / згортання коду
function toggleCode(header) {
    header.parentElement.classList.toggle('open');
}

// Перемикання між лабораторними
function openLab(labId, titleEl) {
    document.querySelectorAll('.lab-section').forEach((sec) => sec.classList.remove('active'));
    document.querySelectorAll('.submenu-wrap').forEach((w) => w.classList.remove('open'));
    document.querySelectorAll('.lab-title').forEach((t) => t.classList.remove('active'));

    const targetSection = document.getElementById(labId);
    if (targetSection) targetSection.classList.add('active');

    titleEl.classList.add('active');
    if (titleEl.nextElementSibling) titleEl.nextElementSibling.classList.add('open');

    const content = document.getElementById('content');
    if (content) content.scrollTop = 0;
}

// Завантаження лабораторних робіт
async function loadReports() {
    const navEl = document.getElementById("lab-nav");
    const contentEl = document.getElementById("content");

    navEl.innerHTML = "";
    contentEl.innerHTML = "";

    for (const rep of REPORTS) {
        try {
            // Завантажуємо файл звіту напряму без жодних GitHub API!
            const res = await fetch(rep.file);
            if (!res.ok) throw new Error(`Не знайдено файл ${rep.file} (HTTP ${res.status})`);

            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");
            const reportContent = doc.querySelector(".content") || doc.body;

            // Робимо id розділів унікальними (напр. 01lab-meta), щоб навігація працювала чітко
            reportContent.querySelectorAll("article[id]").forEach((art) => {
                art.id = `${rep.id}-${art.id}`;
            });

            // Автоматично виправляємо шляхи картинок і відео (прибираємо зайві "/" на початку)
            reportContent.querySelectorAll("img, video, source").forEach((el) => {
                const src = el.getAttribute("src");
                if (src && src.startsWith("/")) {
                    el.setAttribute("src", src.replace(/^\/+/, ""));
                }
            });

            // Генеруємо підменю (Мета, Умова, Код...)
            const menuItems = SECTIONS.map(
                ([id, label]) => `<li><a href="#${rep.id}-${id}">${label}</a></li>`
            ).join("");

            // Додаємо кнопку в ліве меню
            navEl.insertAdjacentHTML(
                "beforeend",
                `<div class="lab-title" onclick="openLab('${rep.id}', this)">${rep.title}</div>
                 <div class="submenu-wrap">
                    <ul class="submenu">${menuItems}</ul>
                 </div>`
            );

            // Вставляємо вміст звіту на сторінку
            contentEl.insertAdjacentHTML(
                "beforeend",
                `<section id="${rep.id}" class="lab-section">${reportContent.innerHTML}</section>`
            );

        } catch (err) {
            console.error(err);
            navEl.insertAdjacentHTML("beforeend", `<p class="state-message" style="color:#f38ba8">${err.message}</p>`);
        }
    }

    // Автоматично відкриваємо першу лабораторну
    document.querySelector(".lab-title")?.click();
}

// Запуск при завантаженні сайту
document.addEventListener("DOMContentLoaded", loadReports);