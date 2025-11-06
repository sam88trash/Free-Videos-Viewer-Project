// CONFIG
const MANIFEST_URL = './videos.json?t=' + new Date().getTime();

const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const tpl = document.getElementById('cardTpl');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');

const modal = document.getElementById('modal');
const closeBtn = document.getElementById('closeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const videoPlayer = document.getElementById('videoPlayer');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');

let videos = [];

// Load JSON manifest
async function loadManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Manifest not found: ' + res.status);
    videos = await res.json();
    renderGrid();
  } catch (e) {
    console.warn('Could not load manifest:', e);
    grid.innerHTML = '';
    empty.style.display = 'block';
  }
}

// Render video cards
function renderGrid() {
  const q = searchInput.value.trim().toLowerCase();
  let list = videos.slice();
  if (sortSelect.value === 'title') list.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  if (q) list = list.filter(v => ((v.title||'') + ' ' + (v.description||'')).toLowerCase().includes(q));

  grid.innerHTML = '';
  empty.style.display = list.length === 0 ? 'block' : 'none';
  if(list.length === 0) return;

  for(const v of list) {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    const img = node.querySelector('.thumb');
    const title = node.querySelector('.title');
    const desc = node.querySelector('.desc');

    card.dataset.file = v.file;
    img.alt = v.title || 'video thumb';
    title.textContent = v.title || v.file;
    desc.textContent = v.description || '';

    img.src = v.thumb && v.thumb !== 'none'
      ? v.thumb
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="%23081223"/><text x="50%" y="50%" fill="%239aa4b2" font-size="24" text-anchor="middle" dominant-baseline="central">No+thumb</text></svg>';

    card.addEventListener('click', () => openPlayer(v));

    grid.appendChild(node);

    // This must be inside the loop!
    if (!v.thumb || v.thumb === 'none') {
      generateCardThumbnail(card, v);
    }
  }
}

// Generate placeholder thumbnail using html2canvas
async function generateCardThumbnail(card, v) {
  try {
    const storageKey = 'thumb_' + v.file;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      card.querySelector('.thumb').src = cached;
      return;
    }

    const canvas = await html2canvas(card, { backgroundColor: null });
    const dataUrl = canvas.toDataURL('image/jpeg');
    card.querySelector('.thumb').src = dataUrl;

    // Cache in localStorage
    localStorage.setItem(storageKey, dataUrl);
  } catch (err) {
    console.warn('Could not generate thumbnail for card:', err);
  }
}

// Fullscreen video player
function openPlayer(v) {
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  videoPlayer.src = v.file;
  videoPlayer.poster = v.thumb || '';
  modalTitle.textContent = v.title || v.file;
  modalDesc.textContent = v.description || '';
  downloadBtn.onclick = () => { window.open(v.file, '_blank'); };
  videoPlayer.play().catch(() => {});
  document.body.style.overflow = 'hidden';
}

function closePlayer() {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  videoPlayer.pause();
  try { videoPlayer.removeAttribute('src'); videoPlayer.load(); } catch (e) {}
  document.body.style.overflow = '';
}

// Event listeners
closeBtn.addEventListener('click', closePlayer);
modal.addEventListener('click', (e) => { if (e.target === modal) closePlayer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePlayer(); });
searchInput.addEventListener('input', debounce(renderGrid, 180));
sortSelect.addEventListener('change', renderGrid);

// Debounce helper
function debounce(fn, wait) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}

// Initialize
loadManifest();
