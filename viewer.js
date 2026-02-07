// PDF file path
const url = "./assets/portfolio.pdf";

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js";

const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const pageInput = document.getElementById("pageInput");
const pageCountEl = document.getElementById("pageCount");
const loadingEl = document.getElementById("loading");

let pdfDoc = null;
let pageNum = 1;
let rendering = false;
let pendingNum = null;

function getHashPage() {
  const m = location.hash.match(/page=(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}
function setHashPage(n) {
  history.replaceState(null, "", `#page=${n}`);
}

function getScale(viewport) {
  // Fit to width, with a gentle cap for huge screens
  const wrap = canvas.parentElement;
  const targetWidth = Math.min(wrap.clientWidth - 20, 1100);
  return targetWidth / viewport.width;
}

async function renderPage(num) {
  if (rendering) { pendingNum = num; return; }
  rendering = true;
  loadingEl.style.display = "grid";

  const page = await pdfDoc.getPage(num);
  const unscaled = page.getViewport({ scale: 1 });
  const scale = getScale(unscaled);
  const viewport = page.getViewport({ scale });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const renderTask = page.render({ canvasContext: ctx, viewport });
  await renderTask.promise;

  loadingEl.style.display = "none";
  rendering = false;

  if (pendingNum !== null) {
    const next = pendingNum; pendingNum = null;
    renderPage(next);
  }
}

function clampAndGo(n) {
  if (!pdfDoc) return;
  const clamped = Math.min(Math.max(1, n), pdfDoc.numPages);
  pageNum = clamped;
  pageInput.value = String(pageNum);
  setHashPage(pageNum);
  renderPage(pageNum);
}

function bindUI() {
  prevBtn.addEventListener("click", () => clampAndGo(pageNum - 1));
  nextBtn.addEventListener("click", () => clampAndGo(pageNum + 1));

  pageInput.addEventListener("change", () => {
    clampAndGo(parseInt(pageInput.value || "1", 10));
  });

  // Keyboard arrows
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") clampAndGo(pageNum - 1);
    if (e.key === "ArrowRight") clampAndGo(pageNum + 1);
  });

  // Re-render on resize to keep it fitted
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => renderPage(pageNum), 120);
  });

  // If user changes URL hash manually
  window.addEventListener("hashchange", () => {
    clampAndGo(getHashPage());
  });
}

(async function init() {
  pdfDoc = await pdfjsLib.getDocument(url).promise;
  pageCountEl.textContent = String(pdfDoc.numPages);

  bindUI();
  clampAndGo(getHashPage());
})();


