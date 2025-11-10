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

  if (sortSelect.value === 'title') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  if (q) {
    list = list.filter(v =>
      ((v.title || '') + ' ' + (v.description || '')).toLowerCase().includes(q)
    );
  }

  grid.innerHTML = '';
  empty.style.display = list.length === 0 ? 'block' : 'none';
  console.log('Rendering grid:', list.length, 'items', list);
  if (list.length === 0) return;

  for (const v of list) {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    const img = node.querySelector('.thumb');
    const title = node.querySelector('.title');
    const desc = node.querySelector('.desc');

    card.dataset.file = v.file;
    img.alt = v.title || 'video thumb';
    title.textContent = v.title || v.file;
    desc.textContent = v.description || '';

    // Use actual thumbnail if available, otherwise default placeholder
    img.src = v.thumb && v.thumb !== 'none'
      ? v.thumb
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="%23081223"/><text x="50%" y="50%" fill="%239aa4b2" font-size="24" text-anchor="middle" dominant-baseline="central">No+thumb</text></svg>';

    const media = document.createElement('div');
    media.className = 'media';
    
    const video = document.createElement('video');
    video.className = 'preview';
    video.src = v.preview || v.file; // use dedicated preview if available, else main video
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.style.display = 'none';
    
    media.appendChild(img);
    media.appendChild(video);
    // 🧠 Insert media *before* the meta text block
    card.insertBefore(media, meta);

    // Card click opens video player
    card.addEventListener('click', () => openPlayer(v));
    card.addEventListener('mouseenter', () => {
      video.currentTime = 0;
      img.style.display = 'none';
      video.style.display = 'block';
      video.play().catch(() => {});
    });
    
    card.addEventListener('mouseleave', () => {
      video.pause();
      video.style.display = 'none';
      img.style.display = 'block';
    });

    grid.appendChild(node);
  }
}


// Fullscreen video player
function openPlayer(v) {
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  modalTitle.textContent = v.title || v.file;
  modalDesc.textContent = v.description || '';
  downloadBtn.onclick = () => window.open(v.file, '_blank');

  const src = v.file;
  videoPlayer.poster = v.thumb || '';
  
  // If HLS.js is supported and it's an m3u8 file
  if (Hls.isSupported() && src.endsWith('.m3u8')) {
    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(videoPlayer);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoPlayer.play().catch(() => {});
    });
  } 
  // If the browser supports HLS natively (Safari, iOS)
  else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = src;
    videoPlayer.addEventListener('loadedmetadata', () => {
      videoPlayer.play().catch(() => {});
    });
  } 
  // Otherwise normal video (mp4, webm, etc.)
  else {
    videoPlayer.src = src;
    videoPlayer.play().catch(() => {});
  }

  document.body.style.overflow = 'hidden';
}


function closePlayer() {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.load();
  document.body.style.overflow = '';
}


// Event listeners
closeBtn.addEventListener('click', closePlayer);
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
