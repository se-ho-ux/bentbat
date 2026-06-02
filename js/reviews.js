(async function () {
  let data;
  try {
    const res = await fetch('/reviews.json');
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return;
  }

  if (!data.reviews || !data.reviews.length) return;

  // Mettre à jour le badge Google (note + nombre d'avis)
  document.querySelectorAll('.google-badge-score').forEach(el => {
    el.textContent = data.rating.toFixed(1).replace('.', ',');
  });
  document.querySelectorAll('.google-badge-label').forEach(el => {
    el.textContent = `${data.total} avis Google · Travaux généraux Paris`;
  });

  function buildCard(rev) {
    const initials = rev.author
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const stars = '<i class="fas fa-star"></i>'.repeat(Math.min(rev.rating, 5));
    return `
      <div class="testimonial-card">
        <div class="t-stars">${stars}</div>
        <p class="t-text">« ${rev.text} »</p>
        <div class="t-author">
          <div class="t-avatar">${initials}</div>
          <div>
            <div class="t-name">${rev.author}</div>
            <div class="t-location">${rev.time}</div>
          </div>
        </div>
      </div>`;
  }

  // Page d'accueil : 3 avis max
  const gridHome = document.getElementById('reviews-grid-home');
  if (gridHome) {
    gridHome.innerHTML = data.reviews.slice(0, 3).map(buildCard).join('');
  }

  // Page À propos : tous les avis
  const gridApropos = document.getElementById('reviews-grid-apropos');
  if (gridApropos) {
    gridApropos.innerHTML = data.reviews.map(buildCard).join('');
  }
})();
