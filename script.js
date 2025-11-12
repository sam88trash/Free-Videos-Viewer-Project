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
    const meta = node.querySelector('.meta');
    const title = node.querySelector('.title');
    const desc = node.querySelector('.desc');

    // Normalize field names to handle JSON variations
    const file = v.file || v.video || v.link || '';
    const thumb = v.thumb || v.thumbnail || v.image || '';
    
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
  document.body.style.overflow = 'hidden';

  const src = v.file;
  const isEmbed = src.includes('youtube.com/embed') || src.includes('player.vimeo.com') || src.includes('iframe');

  // Clear the modal before adding the player
  const existingIframe = modal.querySelector('iframe');
  if (existingIframe) existingIframe.remove();

  // Reset video player
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.style.display = 'none';

  if (isEmbed) {
    // Create an iframe for embeds
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.flex = '1';
    videoPlayer.replaceWith(iframe);
  } else {
    // Restore video element if not an embed
    const existingIframe2 = modal.querySelector('iframe');
    if (existingIframe2) existingIframe2.remove();
    if (!modal.contains(videoPlayer)) {
      const playerContainer = modal.querySelector('.player');
      playerContainer.insertBefore(videoPlayer, modalDesc);
    }

    videoPlayer.style.display = 'block';
    videoPlayer.poster = v.thumb || '';

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoPlayer);
      hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play().catch(() => {}));
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      videoPlayer.src = src;
      videoPlayer.addEventListener('loadedmetadata', () => videoPlayer.play().catch(() => {}));
    } else {
      videoPlayer.src = src;
      videoPlayer.play().catch(() => {});
    }
  }
}


function closePlayer() {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');

  // Stop video
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.load();

  // Remove iframe if any
  const existingIframe = modal.querySelector('iframe');
  if (existingIframe) existingIframe.remove();

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
