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
  let current = 0;

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
})();
