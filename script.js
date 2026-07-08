(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const progress = document.getElementById('progress');
  const counter = document.getElementById('counter');
  const notesPanel = document.getElementById('notesPanel');
  const notesText = document.getElementById('notesText');
  const overview = document.getElementById('overview');
  const goModal = document.getElementById('goModal');
  const goForm = document.getElementById('goForm');
  const goInput = document.getElementById('goInput');
  const canvases = Array.from(document.querySelectorAll('.concept-canvas'));
  let current = 0;
  let rafId = 0;

  function clampSlide(index) {
    return Math.max(0, Math.min(slides.length - 1, index));
  }

  function renderMath(slide) {
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([slide]).catch(() => {});
    }
  }

  function showSlide(index) {
    current = clampSlide(index);
    slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
    progress.style.width = `${((current + 1) / slides.length * 100).toFixed(2)}%`;
    counter.textContent = `${current + 1} / ${slides.length}`;
    notesText.textContent = slides[current].dataset.notes || '';
    document.querySelectorAll('.thumb').forEach((thumb, i) => thumb.classList.toggle('active-thumb', i === current));
    history.replaceState(null, '', `#${current + 1}`);
    renderMath(slides[current]);
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const width = Math.max(600, Math.floor(rect.width * scale));
    const height = Math.max(360, Math.floor(rect.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  function ease(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  function loop01(time, duration, offset = 0) {
    return ((time / duration + offset) % 1 + 1) % 1;
  }

  function mix(a, b, t) {
    return a + (b - a) * ease(Math.max(0, Math.min(1, t)));
  }

  function roundRect(ctx, x, y, w, h, r = 10) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function box(ctx, x, y, w, h, label, opts = {}) {
    roundRect(ctx, x, y, w, h, opts.r || 10);
    ctx.fillStyle = opts.fill || 'rgba(255,255,255,.07)';
    ctx.strokeStyle = opts.stroke || 'rgba(255,255,255,.18)';
    ctx.lineWidth = opts.line || 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = opts.color || '#f4f8fb';
    ctx.font = `${opts.weight || 850} ${opts.size || 18}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    wrapText(ctx, label, x + w / 2, y + h / 2, w - 22, opts.size || 18, opts.lineHeight || 22);
  }

  function pill(ctx, x, y, text, color = '#36d7ff') {
    ctx.font = '850 14px ui-monospace, Menlo, monospace';
    const w = ctx.measureText(text).width + 24;
    roundRect(ctx, x, y, w, 30, 15);
    ctx.fillStyle = `${color}22`;
    ctx.strokeStyle = `${color}88`;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f4f8fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 15);
    return w;
  }

  function wrapText(ctx, text, x, y, maxWidth, size, lineHeight) {
    const lines = [];
    String(text).split('\n').forEach(part => {
      const words = part.split(' ');
      let line = '';
      words.forEach(word => {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      lines.push(line);
    });
    const startY = y - (lines.length - 1) * lineHeight / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  }

  function arrow(ctx, x1, y1, x2, y2, color = 'rgba(54,215,255,.75)') {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 12 * Math.cos(angle - .45), y2 - 12 * Math.sin(angle - .45));
    ctx.lineTo(x2 - 12 * Math.cos(angle + .45), y2 - 12 * Math.sin(angle + .45));
    ctx.closePath();
    ctx.fill();
  }

  function movingDot(ctx, x1, y1, x2, y2, t, color = '#ffca68', radius = 6) {
    const x = mix(x1, x2, t);
    const y = mix(y1, y2, t);
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for (let x = 24; x < w; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 24; y < h; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  function drawIngestion(ctx, w, h, time) {
    clear(ctx, w, h);
    const margin = 38;
    const y = h * .16;
    const doc = { x: margin, y, w: w * .22, h: h * .66 };
    const chunkX = w * .34;
    const vectorX = w * .58;
    const index = { x: w * .78, y: h * .18, w: w * .17, h: h * .62 };
    box(ctx, doc.x, doc.y, doc.w, doc.h, 'Policy.pdf\nSection 4.2\nContractors are not eligible for PTO...', { fill: '#eef7ff', stroke: 'rgba(54,215,255,.5)', color: '#101827', size: 17 });
    box(ctx, index.x, index.y, index.w, index.h, 'Vector / Search Index', { fill: 'rgba(54,215,255,.08)', stroke: 'rgba(54,215,255,.45)', size: 19 });
    const p = loop01(time, 5200);
    ['section title', 'eligibility clause', 'exception note'].forEach((label, i) => {
      const yy = y + 64 + i * 72;
      const phase = Math.max(0, Math.min(1, (p - .08 - i * .05) / .22));
      const cx = mix(doc.x + 24, chunkX, phase);
      const alpha = p < .85 ? 1 : Math.max(0, (1 - p) / .15);
      ctx.globalAlpha = alpha;
      box(ctx, cx, yy, w * .17, 46, label, { fill: 'rgba(85,232,157,.12)', stroke: 'rgba(85,232,157,.55)', size: 15 });
      const vphase = Math.max(0, Math.min(1, (p - .36 - i * .05) / .2));
      const vx = mix(chunkX, vectorX, vphase);
      box(ctx, vx, yy, w * .16, 46, `[${(.12+i*.19).toFixed(2)}, ${(-.44+i*.23).toFixed(2)}, ...]`, { fill: 'rgba(54,215,255,.12)', stroke: 'rgba(54,215,255,.55)', size: 14 });
      const iphase = Math.max(0, Math.min(1, (p - .61 - i * .05) / .2));
      movingDot(ctx, vectorX + w * .16, yy + 23, index.x + index.w * (.32 + i * .18), index.y + index.h * (.36 + i * .13), iphase, '#55e89d', 7);
      ctx.globalAlpha = 1;
    });
    arrow(ctx, doc.x + doc.w + 12, h * .5, chunkX - 16, h * .5);
    arrow(ctx, chunkX + w * .18, h * .5, vectorX - 16, h * .5);
    arrow(ctx, vectorX + w * .17, h * .5, index.x - 16, h * .5);
    pill(ctx, margin, h - 46, 'parse -> chunk -> embed -> index', '#55e89d');
  }

  function drawVectors(ctx, w, h, time) {
    clear(ctx, w, h);
    const points = [
      ['contractor eligibility', .63, .38, '#55e89d'],
      ['contractor PTO clause', .45, .58, '#55e89d'],
      ['employee benefits', .73, .67, '#9a8cff'],
      ['travel reimbursement', .25, .30, '#ff6d7a'],
      ['holiday calendar', .31, .75, '#9a8cff']
    ];
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(70, h - 58);
    ctx.lineTo(w - 48, h - 58);
    ctx.moveTo(70, h - 58);
    ctx.lineTo(70, 36);
    ctx.stroke();
    points.forEach(([label, px, py, color]) => {
      const x = px * w;
      const y = py * h;
      ctx.fillStyle = color;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f4f8fb';
      ctx.font = '850 15px Inter, system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 13, y - 12);
    });
    const p = loop01(time, 4200);
    const qx = mix(w * .12, w * .53, Math.min(1, p / .38));
    const qy = mix(h * .18, h * .51, Math.min(1, p / .38));
    ctx.strokeStyle = 'rgba(255,202,104,.55)';
    ctx.lineWidth = 2;
    points.slice(0, 2).forEach(([, px, py]) => {
      if (p > .45) {
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(px * w, py * h);
        ctx.stroke();
      }
    });
    if (p > .55) {
      ctx.strokeStyle = 'rgba(85,232,157,.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(w * .54, h * .48, w * .16, h * .18, -.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffca68';
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#ffca68';
    ctx.beginPath();
    ctx.arc(qx, qy, 12 + Math.sin(time / 240) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    pill(ctx, qx + 18, qy + 16, 'query: contractor PTO', '#ffca68');
    pill(ctx, 38, 28, p < .42 ? 'query vector enters space' : 'nearest chunks light up', '#36d7ff');
  }

  function drawQuery(ctx, w, h, time) {
    clear(ctx, w, h);
    const labels = ['User', 'Rewrite', 'Hybrid Retrieve', 'Rerank', 'Prompt', 'LLM', 'Answer + Citations'];
    const y = h * .48;
    const gap = (w - 100) / labels.length;
    const boxes = labels.map((label, i) => ({ x: 50 + i * gap, y: y - 42, w: Math.min(140, gap - 16), h: 84, label }));
    boxes.forEach((b, i) => {
      box(ctx, b.x, b.y, b.w, b.h, b.label, { fill: i === boxes.length - 1 ? 'rgba(85,232,157,.13)' : 'rgba(255,255,255,.065)', stroke: i === boxes.length - 1 ? 'rgba(85,232,157,.5)' : 'rgba(255,255,255,.18)', size: 15 });
      if (i < boxes.length - 1) arrow(ctx, b.x + b.w + 4, y, boxes[i+1].x - 8, y, 'rgba(54,215,255,.55)');
    });
    ['contractor PTO', 'leave eligibility', 'People Ops policy'].forEach((q, i) => {
      const p = loop01(time, 4300, i * -.08);
      const segment = Math.min(boxes.length - 2, Math.floor(p * (boxes.length - 1)));
      const local = (p * (boxes.length - 1)) % 1;
      const a = boxes[segment];
      const b = boxes[segment + 1];
      movingDot(ctx, a.x + a.w, y + (i - 1) * 18, b.x, y + (i - 1) * 18, local, i === 0 ? '#ffca68' : '#36d7ff', 6);
      if (p < .25) pill(ctx, boxes[1].x - 18, 58 + i * 34, q, '#36d7ff');
    });
    pill(ctx, 44, h - 54, 'rewrite fan-out -> retrieve -> rerank -> grounded answer', '#55e89d');
  }

  function drawHybrid(ctx, w, h, time) {
    clear(ctx, w, h);
    const left = { x: 56, y: 58, w: w * .28, h: 130 };
    const right = { x: w - 56 - w * .28, y: 58, w: w * .28, h: 130 };
    const pool = { x: w * .35, y: h * .66, w: w * .30, h: 105 };
    box(ctx, left.x, left.y, left.w, left.h, 'BM25\nexact terms, IDs, acronyms', { fill: 'rgba(255,202,104,.1)', stroke: 'rgba(255,202,104,.45)' });
    box(ctx, right.x, right.y, right.w, right.h, 'Dense Vectors\nmeaning, paraphrases', { fill: 'rgba(54,215,255,.1)', stroke: 'rgba(54,215,255,.45)' });
    box(ctx, pool.x, pool.y, pool.w, pool.h, 'Candidate Pool\nscore fusion + filters', { fill: 'rgba(85,232,157,.11)', stroke: 'rgba(85,232,157,.52)' });
    const terms = [['PTO', '#ffca68'], ['policy-17B', '#ffca68'], ['offboarding', '#36d7ff'], ['contractor leave', '#36d7ff']];
    terms.forEach(([term, color], i) => {
      const fromLeft = i < 2;
      const sx = fromLeft ? left.x + left.w * (.32 + i * .25) : right.x + right.w * (.28 + (i - 2) * .3);
      const sy = fromLeft ? left.y + left.h + 8 : right.y + right.h + 8;
      const tx = pool.x + pool.w * (.25 + i * .16);
      const ty = pool.y + 24;
      const p = loop01(time, 3600, i * -.09);
      arrow(ctx, sx, sy, tx, ty, `${color}66`);
      movingDot(ctx, sx, sy, tx, ty, p, color, 7);
      if (p > .55) pill(ctx, tx - 28, ty + 26 + i * 12, term, color);
    });
  }

  function drawRerank(ctx, w, h, time) {
    clear(ctx, w, h);
    const before = ['Employee PTO overview', 'Contractor eligibility', 'Holiday calendar', 'Onboarding checklist'];
    const after = ['Contractor eligibility', 'PTO exceptions', 'Effective date note', 'Employee PTO overview'];
    ctx.fillStyle = '#f4f8fb';
    ctx.font = '900 24px Inter, system-ui';
    ctx.fillText('Retriever candidates', 58, 54);
    ctx.fillText('Reranked evidence', w * .64, 54);
    box(ctx, w * .42, h * .36, w * .16, 110, 'Reranker\nquery-document cross-check', { fill: 'rgba(54,215,255,.11)', stroke: 'rgba(54,215,255,.55)', size: 16 });
    before.forEach((text, i) => {
      const y = 92 + i * 68;
      const good = text.includes('Contractor');
      box(ctx, 58, y, w * .28, 48, text, { fill: good ? 'rgba(85,232,157,.12)' : 'rgba(255,255,255,.055)', stroke: good ? 'rgba(85,232,157,.55)' : 'rgba(255,255,255,.16)', size: 15 });
      const p = loop01(time, 3800, i * -.06);
      if (good || p > .42) movingDot(ctx, 58 + w * .28, y + 24, w * .42, h * .41, p, good ? '#55e89d' : '#9dadbd', good ? 7 : 4);
    });
    after.forEach((text, i) => {
      const y = 92 + i * 68;
      const p = loop01(time, 3800, i * -.08);
      const rise = text.includes('Contractor') ? Math.sin(Math.min(1, p * 2) * Math.PI) * -22 : 0;
      box(ctx, w * .64, y + rise, w * .29, 48, text, { fill: i < 3 ? 'rgba(85,232,157,.11)' : 'rgba(255,202,104,.08)', stroke: i < 3 ? 'rgba(85,232,157,.48)' : 'rgba(255,202,104,.34)', size: 15 });
    });
    pill(ctx, w * .42, h - 52, 'broad retrieval is cheap; evidence selection is careful', '#ffca68');
  }

  function drawContext(ctx, w, h, time) {
    clear(ctx, w, h);
    const chunks = [
      ['current contractor PTO clause', true],
      ['effective date + citation', true],
      ['outdated employee policy', false],
      ['similar travel policy', false],
      ['exception language', true]
    ];
    box(ctx, w * .58, 62, w * .34, h * .68, 'Context Window', { fill: 'rgba(54,215,255,.07)', stroke: 'rgba(54,215,255,.42)', size: 24 });
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, w * .61, 116, w * .28, 14, 8);
    ctx.fill();
    const fill = Math.min(.72, loop01(time, 4500) * 1.15);
    ctx.fillStyle = fill > .66 ? '#ffca68' : '#55e89d';
    roundRect(ctx, w * .61, 116, w * .28 * fill, 14, 8);
    ctx.fill();
    chunks.forEach(([text, keep], i) => {
      const sy = 72 + i * 64;
      box(ctx, 56, sy, w * .34, 44, text, { fill: keep ? 'rgba(85,232,157,.1)' : 'rgba(255,109,122,.1)', stroke: keep ? 'rgba(85,232,157,.45)' : 'rgba(255,109,122,.45)', size: 14 });
      const p = loop01(time, 4500, i * -.08);
      const tx = keep ? w * .63 : w * .47;
      const ty = keep ? 160 + i * 38 : sy + 22;
      movingDot(ctx, 56 + w * .34, sy + 22, tx, ty, p, keep ? '#55e89d' : '#ff6d7a', keep ? 7 : 5);
      if (keep && p > .52) box(ctx, w * .63, ty - 18, w * .24, 36, text.replace('current ', ''), { fill: 'rgba(85,232,157,.12)', stroke: 'rgba(85,232,157,.45)', size: 13 });
      if (!keep && p > .52) pill(ctx, tx - 24, ty + 10, 'reject', '#ff6d7a');
    });
  }

  const drawers = {
    ingestion: drawIngestion,
    vectors: drawVectors,
    query: drawQuery,
    hybrid: drawHybrid,
    rerank: drawRerank,
    context: drawContext
  };

  function animateCanvases(time = 0) {
    const activeCanvas = slides[current].querySelector('.concept-canvas');
    if (activeCanvas) {
      const { ctx, w, h } = resizeCanvas(activeCanvas);
      const drawer = drawers[activeCanvas.dataset.anim];
      if (drawer) drawer(ctx, w, h, time);
    }
    rafId = requestAnimationFrame(animateCanvases);
  }

  function nextSlide() {
    showSlide(current + 1);
  }

  function previousSlide() {
    showSlide(current - 1);
  }

  function closeOverlays() {
    overview.classList.remove('show');
    goModal.classList.remove('show');
    notesPanel.classList.remove('show');
  }

  function toggleOverview() {
    overview.classList.toggle('show');
  }

  function openGoModal() {
    goInput.max = String(slides.length);
    goInput.value = String(current + 1);
    goModal.classList.add('show');
    setTimeout(() => goInput.focus(), 30);
  }

  function goToInputSlide() {
    const value = Number.parseInt(goInput.value, 10);
    if (Number.isFinite(value)) {
      showSlide(value - 1);
      closeOverlays();
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  slides.forEach((slide, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.innerHTML = `<small>Slide ${index + 1}</small><strong>${slide.dataset.title || 'Untitled'}</strong>`;
    thumb.addEventListener('click', () => {
      showSlide(index);
      closeOverlays();
    });
    overview.appendChild(thumb);
  });

  document.getElementById('next').addEventListener('click', nextSlide);
  document.getElementById('prev').addEventListener('click', previousSlide);
  document.getElementById('notesBtn').addEventListener('click', () => notesPanel.classList.toggle('show'));
  document.getElementById('overviewBtn').addEventListener('click', toggleOverview);
  document.getElementById('goBtn').addEventListener('click', openGoModal);
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

  goForm.addEventListener('submit', event => {
    event.preventDefault();
    goToInputSlide();
  });

  goModal.addEventListener('click', event => {
    if (event.target === goModal) closeOverlays();
  });

  document.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement) return;

    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      nextSlide();
    } else if (event.key === 'ArrowLeft') {
      previousSlide();
    } else if (event.key === 'Home') {
      showSlide(0);
    } else if (event.key === 'End') {
      showSlide(slides.length - 1);
    } else if (event.key.toLowerCase() === 'f') {
      toggleFullscreen();
    } else if (event.key.toLowerCase() === 's') {
      notesPanel.classList.toggle('show');
    } else if (event.key.toLowerCase() === 'o') {
      toggleOverview();
    } else if (event.key.toLowerCase() === 'g') {
      openGoModal();
    } else if (event.key === 'Escape') {
      closeOverlays();
    }
  });

  const requestedSlide = Number.parseInt(window.location.hash.replace('#', ''), 10);
  showSlide(Number.isFinite(requestedSlide) ? requestedSlide - 1 : 0);
  canvases.forEach(resizeCanvas);
  window.addEventListener('resize', () => canvases.forEach(resizeCanvas));
  rafId = requestAnimationFrame(animateCanvases);
})();
