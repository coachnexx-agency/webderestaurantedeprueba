(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Secuencia de entrada del hero
  document.querySelectorAll('.hero-title span').forEach((s, i) => s.style.setProperty('--i', i));
  const start = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
  // Por si el vídeo tarda: no dejar el título oculto
  setTimeout(start, 1800);

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Cabecera sólida al hacer scroll
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Vídeos: pausados fuera de pantalla o con movimiento reducido
  const videos = document.querySelectorAll('video');
  if (reduceMotion) {
    videos.forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
  } else if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      });
    }, { threshold: 0.1 });
    videos.forEach(v => vio.observe(v));
  }

  // Los platos giran lentamente con el scroll
  const plates = [...document.querySelectorAll('.dish-plate img')];
  if (!reduceMotion && plates.length) {
    let ticking = false;
    const spin = () => {
      const vh = window.innerHeight;
      plates.forEach((img, i) => {
        const r = img.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const progress = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 aprox.
        const dir = i % 2 ? -1 : 1;
        img.style.setProperty('--spin', `${(progress * 40 * dir).toFixed(2)}deg`);
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(spin); }
    }, { passive: true });
    spin();
  }

  // Diálogos
  const open = id => {
    const dlg = document.getElementById(id);
    if (!dlg) return;
    resetDialog(dlg);
    dlg.showModal();
    const first = dlg.querySelector('input:not([type=radio]), select, textarea');
    if (first) first.focus();
  };
  const resetDialog = dlg => {
    const form = dlg.querySelector('form');
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelector('.form-error').hidden = true;
    form.querySelector('[data-step="form"]').hidden = false;
    form.querySelector('[data-step="done"]').hidden = true;
  };
  document.querySelectorAll('[data-open]').forEach(btn =>
    btn.addEventListener('click', () => open(btn.dataset.open)));
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
  });

  const validate = form => {
    let ok = true;
    form.querySelectorAll('[data-step="form"] [required]').forEach(el => {
      const valid = el.checkValidity();
      if (valid) el.removeAttribute('aria-invalid');
      else el.setAttribute('aria-invalid', 'true');
      ok = ok && valid;
    });
    form.querySelector('.form-error').hidden = ok;
    if (!ok) form.querySelector('[aria-invalid="true"]').focus();
    return ok;
  };
  const showDone = form => {
    form.querySelector('[data-step="form"]').hidden = true;
    const done = form.querySelector('[data-step="done"]');
    done.hidden = false;
    done.querySelector('button').focus();
  };

  // Reserva
  const reservaForm = document.querySelector('[data-form="reserva"]');
  if (!reservaForm) return;
  const fecha = reservaForm.elements.fecha;
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  fecha.min = today.toISOString().slice(0, 10);

  reservaForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = reservaForm.elements;
    // Cerrado los lunes y los domingos por la noche
    const day = f.fecha.value ? new Date(f.fecha.value + 'T12:00').getDay() : -1;
    f.fecha.setCustomValidity(day === 1 ? 'Cerrado los lunes' : '');
    f.hora.setCustomValidity(day === 0 && f.hora.value >= '20:00' ? 'Domingo solo mediodía' : '');
    const err = reservaForm.querySelector('.form-error');
    err.textContent = day === 1 ? 'Los lunes cerramos. Elige otro día.'
      : f.hora.validationMessage && day === 0 ? 'Los domingos solo abrimos a mediodía. Elige una hora de comida.'
      : 'Revisa los campos marcados para completar la reserva.';
    if (!validate(reservaForm)) return;
    const d = new Date(f.fecha.value + 'T12:00');
    const dia = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const n = Number(f.personas.value);
    reservaForm.querySelector('[data-summary]').textContent =
      `${f.nombre.value.trim()}, hemos recibido tu solicitud para ${n} ${n === 1 ? 'persona' : 'personas'} el ${dia} a las ${f.hora.value}. Te llamaremos al ${f.telefono.value.trim()} para confirmarla.`;
    showDone(reservaForm);
  });

  // Opiniones (se guardan solo en este navegador)
  const KEY = 'vermeil-opiniones';
  const list = document.getElementById('reviews');
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = items => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} };
  const render = (r, isNew) => {
    const li = document.createElement('li');
    li.className = 'review' + (isNew ? ' is-new' : '');
    const stars = document.createElement('p');
    stars.className = 'stars';
    stars.setAttribute('aria-label', `${r.estrellas} de 5 estrellas`);
    stars.textContent = '★'.repeat(r.estrellas) + '☆'.repeat(5 - r.estrellas);
    const q = document.createElement('blockquote');
    q.textContent = r.texto;
    const who = document.createElement('p');
    who.className = 'who';
    who.textContent = r.nombre;
    li.append(stars, q, who);
    list.append(li);
  };
  load().forEach(r => render(r, false));

  // Enlaces desde otras páginas: index.html#reservar abre la reserva
  if (location.hash === '#reservar') open('reserva');

  const opinionForm = document.querySelector('[data-form="opinion"]');
  opinionForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(opinionForm)) return;
    const f = opinionForm.elements;
    const r = { estrellas: Number(f.estrellas.value), nombre: f.nombre.value.trim(), texto: f.texto.value.trim() };
    const items = load(); items.push(r); save(items);
    render(r, true);
    showDone(opinionForm);
  });

})();
