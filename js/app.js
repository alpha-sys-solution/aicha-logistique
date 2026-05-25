// ============================================================
//  AICHA LOGISTIQUE — app.js v2
//  Interface Gérant : courses, dépenses, validation mensuelle
// ============================================================

let courseEnEdition  = null;
let depenseEnEdition = null;
let camionSelectionne = null; // camion actif pour le gérant
const MOIS_ACTUEL = moisActuel();
const ANNEE_ACTUELLE = anneeActuelle();

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Charger la config Supabase depuis /api/config (variables d'env Cloudflare)
  const configOk = await initSupabase();
  if (!configOk) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#e53e3e;text-align:center;padding:2rem"><div><h2>⚠️ Erreur de configuration</h2><p>Impossible de contacter le serveur. Vérifiez votre connexion ou contactez l\'administrateur.</p></div></div>';
    return;
  }

  const licenceOk = await verifierAuDemarrage();
  if (!licenceOk) { afficherEcran('ecran-licence'); return; }

  const user = recupererSessionUser();
  if (!user) {
    afficherEcran('ecran-login');
    document.getElementById('nom-entreprise-login').textContent = State.nomEntreprise || '';
    return;
  }
  if (user.role === 'admin') { window.location.href = 'admin/index.html'; return; }
  if (user.role === 'gerant') { await demarrerAppGerant(); return; }

  deconnexion();
  afficherEcran('ecran-login');
});

function afficherEcran(id) {
  ['ecran-licence','ecran-login','app'].forEach(e => document.getElementById(e)?.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

// ── DÉMARRAGE GÉRANT ─────────────────────────────────────────
async function demarrerAppGerant() {
  afficherEcran('app');
  const nom = `${State.utilisateur.prenom || ''} ${State.utilisateur.nom}`.trim();
  document.getElementById('user-nom').textContent = nom;
  document.getElementById('user-role-badge').textContent = '👔 Gérant';

  await chargerCamions();

  // Sélectionner le premier camion par défaut
  if (State.camions.length > 0) {
    camionSelectionne = State.camions[0].id;
  }

  afficherOnglet('dashboard');

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('actif'));
      item.classList.add('actif');
      afficherOnglet(item.dataset.onglet);
    });
  });

  // Déconnexion
  document.getElementById('btn-deconnexion')?.addEventListener('click', () => {
    deconnexion();
    location.reload();
  });

  // FABs
  document.getElementById('fab-nouvelle-course')?.addEventListener('click', () => ouvrirModalCourse());
  document.getElementById('fab-nouvelle-depense')?.addEventListener('click', () => ouvrirModalDepense());

  // Notifications
  if (navigator.onLine) verifierAbonnement?.();
  navigator.serviceWorker?.addEventListener('message', handleSWMessage);
}

function handleSWMessage(e) {
  if (e.data?.type !== 'NOTIF_CLICK') return;
  const { data } = e.data;
  if (data?.type === 'demande_approuvee') {
    const conducteurId = State.utilisateur?.id;
    if (conducteurId) {
      localStorage.removeItem('aicha_cache_courses_' + conducteurId);
      localStorage.removeItem('aicha_cache_depenses_' + conducteurId);
    }
    afficherOngletNav(data.typeElement === 'course' ? 'courses' : 'depenses');
    toast('✅ Votre demande a été approuvée', 'success', 6000);
    if (data.elementId) {
      setTimeout(() => data.typeElement === 'course' ? ouvrirDetailCourse(data.elementId) : ouvrirDetailDepense(data.elementId), 800);
    }
  }
}

// ── NAVIGATION ───────────────────────────────────────────────
function afficherOnglet(nom) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${nom}`)?.classList.remove('hidden');

  const fabCourse  = document.getElementById('fab-nouvelle-course');
  const fabDepense = document.getElementById('fab-nouvelle-depense');
  fabCourse?.classList.toggle('hidden',  nom !== 'courses' && nom !== 'dashboard');
  fabDepense?.classList.toggle('hidden', nom !== 'depenses');

  switch (nom) {
    case 'dashboard':   chargerDashboardGerant(); break;
    case 'courses':     chargerCoursesMoisGerant(); break;
    case 'depenses':    chargerDepensesMoisGerant(); break;
    case 'validation':  chargerPageValidation(); break;
    case 'parametres':  chargerPageParametres(); break;
  }
}

function afficherOngletNav(onglet) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('actif'));
  document.querySelector(`.nav-item[data-onglet="${onglet}"]`)?.classList.add('actif');
  afficherOnglet(onglet);
}

// ── SÉLECTEUR CAMION ─────────────────────────────────────────
function renderSelectorCamion(containerId) {
  const container = document.getElementById(containerId);
  if (!container || State.camions.length <= 1) return;
  container.innerHTML = `
    <div class="filtre-periode" style="margin-bottom:16px">
      ${State.camions.map(c => `
        <button class="filtre-btn ${c.id === camionSelectionne ? 'actif' : ''}"
          onclick="selectionnerCamion('${c.id}', '${containerId}')">
          🚛 ${c.immatriculation}
        </button>
      `).join('')}
    </div>`;
}

function selectionnerCamion(id, containerId) {
  camionSelectionne = id;
  // Rafraîchir la page active
  const ongletActif = document.querySelector('.nav-item.actif')?.dataset?.onglet;
  if (ongletActif) afficherOnglet(ongletActif);
}

// ── DASHBOARD GÉRANT ─────────────────────────────────────────
async function chargerDashboardGerant() {
  const debut = debutMois(ANNEE_ACTUELLE, MOIS_ACTUEL);
  const fin   = finMois(ANNEE_ACTUELLE, MOIS_ACTUEL);

  const filtres = camionSelectionne
    ? { camion_id: camionSelectionne, date_debut: debut, date_fin: fin }
    : { date_debut: debut, date_fin: fin };

  const [courses, depenses] = await Promise.all([
    chargerCourses(filtres),
    chargerDepenses(filtres),
  ]);

  const revenu  = courses.reduce((s, c) => s + (Number(c.montant_facture) || 0), 0);
  const depense = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const enCours = courses.filter(c => c.statut === 'en_cours').length;

  document.getElementById('stat-revenus-mois').textContent  = formatFG(revenu);
  document.getElementById('stat-depenses-mois').textContent = formatFG(depense);
  document.getElementById('stat-benefice-mois').textContent = formatFG(revenu - depense);
  document.getElementById('stat-courses-encours').textContent = enCours;
  document.getElementById('mois-label').textContent = `${nomMois(MOIS_ACTUEL)} ${ANNEE_ACTUELLE}`;

  // Selector camion
  renderSelectorCamion('dashboard-camion-selector');

  // Dernières courses
  renderListeCourteCourses(courses.slice(0, 5), 'dernieres-courses');
}

// ── PAGE COURSES ──────────────────────────────────────────────
async function chargerCoursesMoisGerant() {
  renderSelectorCamion('courses-camion-selector');
  const filtres = {
    date_debut: debutMois(ANNEE_ACTUELLE, MOIS_ACTUEL),
    date_fin:   finMois(ANNEE_ACTUELLE, MOIS_ACTUEL),
  };
  if (camionSelectionne) filtres.camion_id = camionSelectionne;

  const courses = await chargerCourses(filtres);
  renderListeCourses(courses, 'liste-courses');
}

function renderListeCourteCourses(courses, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!courses.length) {
    container.innerHTML = '<div class="empty-state"><div class="icone">🚛</div><p>Aucune course ce mois</p></div>';
    return;
  }
  container.innerHTML = courses.map(c => `
    <div class="item-liste" onclick="ouvrirDetailCourse('${c.id}')">
      <div class="flex justify-between items-center">
        <div>
          <div class="item-titre">${c.depart} → ${c.arrivee}</div>
          <div class="item-sous">${formatDate(c.date_course)} · ${c.client || 'Sans client'} · 🚛 ${c.camions?.immatriculation || ''}</div>
          <div class="mt-2">${badgeStatut(c.statut, c.locked)}${c.mois_valide ? '<span class="badge badge-verrouillee" style="margin-left:4px">📋 Mois validé</span>' : ''}</div>
        </div>
        <div class="text-right">
          <div class="item-montant vert">${formatFG(c.montant_facture)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderListeCourses(courses, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!courses.length) {
    container.innerHTML = '<div class="empty-state"><div class="icone">📦</div><p>Aucune course ce mois</p></div>';
    return;
  }
  container.innerHTML = courses.map(c => `
    <div class="item-liste" onclick="ouvrirDetailCourse('${c.id}')">
      <div class="flex justify-between items-center">
        <div style="flex:1;min-width:0">
          <div class="item-titre" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.depart} → ${c.arrivee}</div>
          <div class="item-sous">${formatDate(c.date_course)} · ${c.client || 'Sans client'}</div>
          <div class="item-sous">🚛 ${c.camions?.immatriculation || '—'}</div>
          <div class="mt-2">${badgeStatut(c.statut, c.locked)}${c.mois_valide ? '<span class="badge badge-verrouillee" style="margin-left:4px">📋 Validé</span>' : ''}</div>
        </div>
        <div class="text-right" style="margin-left:12px;flex-shrink:0">
          <div class="item-montant vert">${formatFG(c.montant_facture)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── MODAL COURSE ─────────────────────────────────────────────
function ouvrirModalCourse(course = null) {
  courseEnEdition = course;
  document.getElementById('modal-course-titre').textContent = course ? 'Modifier la course' : 'Nouvelle course';

  const select = document.getElementById('course-camion');
  select.innerHTML = '<option value="">— Sélectionner un camion —</option>' +
    State.camions.filter(c => c.statut === 'actif').map(c =>
      `<option value="${c.id}" ${course?.camion_id === c.id ? 'selected' : ''}>${c.immatriculation}${c.marque ? ' · '+c.marque : ''}</option>`
    ).join('');

  if (!course && camionSelectionne) select.value = camionSelectionne;

  document.getElementById('course-depart').value       = course?.depart || '';
  document.getElementById('course-arrivee').value      = course?.arrivee || '';
  document.getElementById('course-client').value       = course?.client || '';
  document.getElementById('course-marchandise').value  = course?.description_marchandise || '';
  document.getElementById('course-montant').value      = course?.montant_facture || '';
  document.getElementById('course-date').value         = course?.date_course || dateAujourdhui();

  document.getElementById('modal-course-overlay').classList.remove('hidden');
}

document.getElementById('modal-course-overlay')?.addEventListener('click', e => {
  if (e.target.id === 'modal-course-overlay') fermerModalCourse();
});
document.getElementById('btn-fermer-course')?.addEventListener('click', fermerModalCourse);
function fermerModalCourse() {
  document.getElementById('modal-course-overlay').classList.add('hidden');
  courseEnEdition = null;
  // Rafraîchir validation si on y est
  const ongletActif = document.querySelector('.nav-item.actif')?.dataset?.onglet;
  if (ongletActif === 'validation') chargerPageValidation();
}

document.getElementById('form-course')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    const payload = {
      camion_id:               document.getElementById('course-camion').value,
      depart:                  document.getElementById('course-depart').value.trim(),
      arrivee:                 document.getElementById('course-arrivee').value.trim(),
      client:                  document.getElementById('course-client').value.trim(),
      description_marchandise: document.getElementById('course-marchandise').value.trim(),
      montant_facture:         parseInt(document.getElementById('course-montant').value) || 0,
      date_course:             document.getElementById('course-date').value,
    };
    if (!payload.camion_id)  throw new Error('Veuillez sélectionner un camion');
    if (!payload.depart || !payload.arrivee) throw new Error('Départ et arrivée requis');

    if (courseEnEdition) {
      await modifierCourse(courseEnEdition.id, payload);
      toast('Course modifiée', 'success');
    } else {
      const nouvelle = await creerCourse(payload);
      toast('Course créée !', 'success');
      if (nouvelle && !nouvelle._offline) notifNouvelleourse?.(nouvelle);
    }
    fermerModalCourse();
    afficherOngletNav('courses');
  } catch (err) {
    toast(err.message || 'Erreur', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Enregistrer';
  }
});

// ── DETAIL COURSE ─────────────────────────────────────────────
async function ouvrirDetailCourse(id) {
  let course = null;
  try {
    const { data } = await sb.from('courses').select('*, camions(immatriculation)').eq('id', id).single();
    course = data;
  } catch {
    const courses = await chargerCourses({});
    course = courses.find(c => c.id === id);
  }
  if (!course) return;

  document.getElementById('detail-course-titre').textContent = `${course.depart} → ${course.arrivee}`;
  document.getElementById('detail-course-info').innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Date</span><span style="font-weight:700">${formatDate(course.date_course)}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Client</span><span style="font-weight:700">${course.client || '—'}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Marchandise</span><span style="font-weight:700">${course.description_marchandise || '—'}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Camion</span><span style="font-weight:700">🚛 ${course.camions?.immatriculation || '—'}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Montant facturé</span><span style="font-weight:700;color:var(--vert)">${formatFG(course.montant_facture)}</span></div>
      <div class="flex justify-between"><span class="text-sm" style="color:var(--gris-clair)">Statut</span><span>${badgeStatut(course.statut, course.locked)}</span></div>
    </div>`;

  const actionsEl = document.getElementById('detail-course-actions');
  actionsEl.innerHTML = '';

  if (course.mois_valide || course.annee_cloturee) {
    actionsEl.innerHTML = '<div class="verrou-banner">📋 Ce mois a été validé — aucune modification possible.</div>';
  } else if (course.locked) {
    actionsEl.innerHTML = `
      <div class="verrou-banner">🔒 Course verrouillée.</div>
      <button class="btn btn-secondary" onclick="demanderModificationGerant('course','${course.id}')">Demander une modification</button>`;
  } else {
    if (course.statut === 'en_cours') {
      actionsEl.innerHTML += `
        <div class="form-group">
          <label class="form-label">Mode de paiement</label>
          <select class="form-select" id="mode-paiement-select">
            <option value="especes">💵 Espèces</option>
            <option value="virement">🏦 Virement</option>
            <option value="autre">📋 Autre</option>
          </select>
        </div>
        <button class="btn btn-success" style="margin-bottom:8px" onclick="validerPaiementCourse('${course.id}')">✅ Livré et Payé</button>
        <button class="btn btn-secondary" style="margin-bottom:8px" onclick="ouvrirModalCourse(${JSON.stringify(course).replace(/"/g,'&quot;')});fermerModalDetailCourse()">✏️ Modifier</button>
        <button class="btn btn-danger btn-sm" onclick="confirmerSupprimerCourse('${course.id}')">🗑️ Supprimer</button>`;
    }
  }

  document.getElementById('modal-detail-course-overlay').classList.remove('hidden');
}

async function changerStatutCourse(id, statut) {
  try {
    await mettreAJourStatutCourse(id, statut);
    toast('Statut mis à jour', 'success');
    fermerModalDetailCourse();
    chargerCoursesMoisGerant();
  } catch { toast('Erreur', 'error'); }
}

async function validerPaiementCourse(id) {
  const mode = document.getElementById('mode-paiement-select')?.value || 'especes';
  try {
    await mettreAJourStatutCourse(id, 'payee', { mode_paiement: mode });
    toast('Paiement confirmé ! Course verrouillée.', 'success');
    fermerModalDetailCourse();
    chargerCoursesMoisGerant();
  } catch { toast('Erreur', 'error'); }
}

async function confirmerSupprimerCourse(id) {
  if (!confirm('Supprimer cette course définitivement ?')) return;
  try {
    await supprimerCourse(id);
    toast('Course supprimée', 'success');
    fermerModalDetailCourse();
    chargerCoursesMoisGerant();
  } catch { toast('Erreur lors de la suppression', 'error'); }
}

document.getElementById('modal-detail-course-overlay')?.addEventListener('click', e => {
  if (e.target.id === 'modal-detail-course-overlay') fermerModalDetailCourse();
});
document.getElementById('btn-fermer-detail-course')?.addEventListener('click', fermerModalDetailCourse);
function fermerModalDetailCourse() { document.getElementById('modal-detail-course-overlay').classList.add('hidden'); }

// ── DÉPENSES ─────────────────────────────────────────────────
async function chargerDepensesMoisGerant() {
  renderSelectorCamion('depenses-camion-selector');
  const filtres = {
    date_debut: debutMois(ANNEE_ACTUELLE, MOIS_ACTUEL),
    date_fin:   finMois(ANNEE_ACTUELLE, MOIS_ACTUEL),
  };
  if (camionSelectionne) filtres.camion_id = camionSelectionne;
  const depenses = await chargerDepenses(filtres);
  renderListeDepenses(depenses, 'liste-depenses');
}

function renderListeDepenses(depenses, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!depenses.length) {
    container.innerHTML = '<div class="empty-state"><div class="icone">💰</div><p>Aucune dépense ce mois</p></div>';
    return;
  }
  container.innerHTML = depenses.map(d => `
    <div class="item-liste" onclick="ouvrirDetailDepense('${d.id}')">
      <div class="flex justify-between items-center">
        <div>
          <div class="item-titre">${labelCategorie(d.categorie)}</div>
          <div class="item-sous">${d.description || ''} · ${formatDate(d.date_depense)}</div>
          <div class="item-sous">🚛 ${d.camions?.immatriculation || '—'}</div>
          <div class="mt-2">
            <span class="badge badge-${d.categorie}">${labelCategorie(d.categorie)}</span>
            ${d.locked ? '<span class="badge badge-verrouillee" style="margin-left:4px">🔒</span>' : ''}
            ${d.mois_valide ? '<span class="badge badge-verrouillee" style="margin-left:4px">📋</span>' : ''}
            ${d.photo_url ? '<span style="margin-left:4px">📷</span>' : ''}
          </div>
        </div>
        <div class="item-montant rouge">${formatFG(d.montant)}</div>
      </div>
    </div>
  `).join('');
}

function ouvrirModalDepense(depense = null) {
  depenseEnEdition = depense;
  document.getElementById('modal-depense-titre').textContent = depense ? 'Modifier dépense' : 'Nouvelle dépense';

  const select = document.getElementById('depense-camion');
  select.innerHTML = '<option value="">— Sélectionner un camion —</option>' +
    State.camions.filter(c => c.statut === 'actif').map(c =>
      `<option value="${c.id}" ${depense?.camion_id === c.id ? 'selected' : ''}>${c.immatriculation}</option>`
    ).join('');
  if (!depense && camionSelectionne) select.value = camionSelectionne;

  document.getElementById('depense-categorie').value  = depense?.categorie || 'carburant';
  document.getElementById('depense-montant').value    = depense?.montant || '';
  document.getElementById('depense-description').value = depense?.description || '';
  document.getElementById('depense-date').value       = depense?.date_depense || dateAujourdhui();

  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-preview').src = '';
  document.getElementById('depense-photo-input').value = '';
  const placeholder = document.getElementById('zone-photo-placeholder');
  if (placeholder) placeholder.style.display = 'block';
  updateZonePhoto(depense?.montant || 0);

  document.getElementById('modal-depense-overlay').classList.remove('hidden');
}

document.getElementById('depense-montant')?.addEventListener('input', e => updateZonePhoto(parseInt(e.target.value) || 0));
function updateZonePhoto(montant) {
  const requis = montant > 500000;
  document.getElementById('zone-photo')?.classList.toggle('requis-photo', requis);
  const label = document.getElementById('photo-label');
  if (label) label.textContent = requis ? '📷 Photo du reçu OBLIGATOIRE (montant > 500 000 FG)' : '📷 Photo du reçu (optionnel)';
}

document.getElementById('depense-photo-input')?.addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById('photo-preview');
    const placeholder = document.getElementById('zone-photo-placeholder');
    img.src = ev.target.result; img.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
});
document.getElementById('zone-photo')?.addEventListener('click', () => document.getElementById('depense-photo-input').click());

document.getElementById('modal-depense-overlay')?.addEventListener('click', e => {
  if (e.target.id === 'modal-depense-overlay') fermerModalDepense();
});
document.getElementById('btn-fermer-depense')?.addEventListener('click', fermerModalDepense);
function fermerModalDepense() {
  document.getElementById('modal-depense-overlay').classList.add('hidden'); depenseEnEdition = null;
  const ongletActif = document.querySelector('.nav-item.actif')?.dataset?.onglet;
  if (ongletActif === 'validation') chargerPageValidation();
}

document.getElementById('form-depense')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    const montant   = parseInt(document.getElementById('depense-montant').value) || 0;
    const camionId  = document.getElementById('depense-camion').value;
    const photoFile = document.getElementById('depense-photo-input').files[0];
    if (!camionId) throw new Error('Veuillez sélectionner un camion');
    if (montant <= 0) throw new Error('Montant invalide');
    if (montant > 500000 && !photoFile && !depenseEnEdition?.photo_url) throw new Error('Photo obligatoire pour montant > 500 000 FG');

    let photoUrl = depenseEnEdition?.photo_url || null;
    if (photoFile) photoUrl = await uploadPhoto(photoFile);

    const payload = {
      camion_id: camionId,
      categorie: document.getElementById('depense-categorie').value,
      montant,
      description: document.getElementById('depense-description').value.trim(),
      date_depense: document.getElementById('depense-date').value,
      photo_url: photoUrl,
    };

    if (depenseEnEdition) {
      await modifierDepense(depenseEnEdition.id, payload);
      toast('Dépense modifiée', 'success');
    } else {
      const nouvelle = await creerDepense(payload);
      toast('Dépense enregistrée !', 'success');
      if (nouvelle && !nouvelle._offline) notifNouvelleDepense?.(nouvelle);
    }
    fermerModalDepense();
    afficherOngletNav('depenses');
  } catch (err) {
    toast(err.message || 'Erreur', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Enregistrer';
  }
});

async function ouvrirDetailDepense(id) {
  let dep = null;
  try {
    const { data } = await sb.from('depenses').select('*, camions(immatriculation)').eq('id', id).single();
    dep = data;
  } catch { return; }
  if (!dep) return;

  document.getElementById('detail-depense-info').innerHTML = `
    <div class="card">
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Catégorie</span><span class="badge badge-${dep.categorie}">${labelCategorie(dep.categorie)}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Montant</span><span style="font-weight:700;color:var(--rouge)">${formatFG(dep.montant)}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Date</span><span style="font-weight:700">${formatDate(dep.date_depense)}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Camion</span><span style="font-weight:700">🚛 ${dep.camions?.immatriculation || '—'}</span></div>
      <div class="flex justify-between" style="margin-bottom:8px"><span class="text-sm" style="color:var(--gris-clair)">Description</span><span style="font-weight:700">${dep.description || '—'}</span></div>
      ${dep.photo_url ? `<div style="margin-top:12px"><p class="text-sm" style="color:var(--gris-clair);margin-bottom:8px">📷 Reçu</p><img src="${dep.photo_url}" style="width:100%;border-radius:8px;max-height:200px;object-fit:cover" /></div>` : ''}
    </div>`;

  const actionsEl = document.getElementById('detail-depense-actions');
  actionsEl.innerHTML = '';

  if (dep.mois_valide || dep.annee_cloturee) {
    actionsEl.innerHTML = '<div class="verrou-banner">📋 Ce mois a été validé — aucune modification possible.</div>';
  } else if (dep.locked) {
    actionsEl.innerHTML = `
      <div class="verrou-banner">🔒 Dépense verrouillée.</div>
      <button class="btn btn-secondary" onclick="demanderModificationGerant('depense','${dep.id}')">Demander une modification</button>`;
  } else {
    actionsEl.innerHTML = `
      <button class="btn btn-secondary" style="margin-bottom:8px" onclick="ouvrirModalDepense(${JSON.stringify(dep).replace(/"/g,'&quot;')});fermerModalDetailDepense()">✏️ Modifier</button>
      <button class="btn btn-primary" style="margin-bottom:8px" onclick="validerDepense('${dep.id}')">🔒 Valider et verrouiller</button>
      <button class="btn btn-danger btn-sm" onclick="confirmerSupprimerDepense('${dep.id}')">🗑️ Supprimer</button>`;
  }

  document.getElementById('modal-detail-depense-overlay').classList.remove('hidden');
}

async function validerDepense(id) {
  try { await verrouillerDepense(id); toast('Dépense validée', 'success'); fermerModalDetailDepense(); chargerDepensesMoisGerant(); }
  catch { toast('Erreur', 'error'); }
}

async function confirmerSupprimerDepense(id) {
  if (!confirm('Supprimer cette dépense définitivement ?')) return;
  try { await supprimerDepense(id); toast('Dépense supprimée', 'success'); fermerModalDetailDepense(); chargerDepensesMoisGerant(); }
  catch { toast('Erreur', 'error'); }
}

document.getElementById('modal-detail-depense-overlay')?.addEventListener('click', e => {
  if (e.target.id === 'modal-detail-depense-overlay') fermerModalDetailDepense();
});
document.getElementById('btn-fermer-detail-depense')?.addEventListener('click', fermerModalDetailDepense);
function fermerModalDetailDepense() { document.getElementById('modal-detail-depense-overlay').classList.add('hidden'); }

// ── PAGE VALIDATION MENSUELLE ─────────────────────────────────
// ── PAGE VALIDATION MENSUELLE GÉRANT ─────────────────────────
let camionValidationActif = null;

async function chargerPageValidation() {
  const container = document.getElementById('page-validation-content');
  if (!container) return;
  container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

  const validations = await chargerValidationsMois(ANNEE_ACTUELLE, MOIS_ACTUEL);
  const validationMap = {};
  validations.forEach(v => { validationMap[v.camion_id] = v; });

  // Sélectionner le premier camion par défaut
  if (!camionValidationActif && State.camions.length > 0) {
    camionValidationActif = State.camions[0].id;
  }

  let html = `<div class="alerte alerte-info" style="margin-bottom:16px">
    📋 Bilan de <strong>${nomMois(MOIS_ACTUEL)} ${ANNEE_ACTUELLE}</strong><br>
    <small>Vérifiez toutes les entrées puis validez. L'admin confirmera ensuite définitivement.</small>
  </div>`;

  // Sélecteur camion si plusieurs
  if (State.camions.length > 1) {
    html += `<div class="filtre-periode" style="margin-bottom:16px">
      ${State.camions.map(c => `
        <button class="filtre-btn ${c.id === camionValidationActif ? 'actif' : ''}"
          onclick="selectionnerCamionValidation('${c.id}')">
          🚛 ${c.immatriculation}
        </button>`).join('')}
    </div>`;
  }

  const camion = State.camions.find(c => c.id === camionValidationActif) || State.camions[0];
  if (!camion) { container.innerHTML = html + '<div class="empty-state"><div class="icone">🚛</div><p>Aucun camion</p></div>'; return; }

  const validation   = validationMap[camion.id];
  const adminValide  = validation?.admin_valide  || false;
  const gerantValide = validation?.gerant_valide || false;

  const courses  = await chargerCoursesMois(ANNEE_ACTUELLE, MOIS_ACTUEL, camion.id);
  const depenses = await chargerDepensesMois(ANNEE_ACTUELLE, MOIS_ACTUEL, camion.id);
  const revenu   = courses.reduce((s, c) => s + (Number(c.montant_facture) || 0), 0);
  const depense  = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);

  // Badges statut
  const badgeGerant = gerantValide
    ? '<span class="badge badge-payee">✅ Votre validation</span>'
    : '<span class="badge badge-en-cours">⏳ En attente de votre validation</span>';
  const badgeAdmin = adminValide
    ? '<span class="badge badge-payee">🔒 Admin a verrouillé</span>'
    : '<span class="badge badge-en-cours">⏳ En attente admin</span>';

  html += `
    <!-- Statut validation -->
    <div class="card" style="margin-bottom:16px">
      <div class="camion-immat" style="margin-bottom:12px">🚛 ${camion.immatriculation}</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <div><div class="stat-label">Votre bilan</div><div style="margin-top:4px">${badgeGerant}</div></div>
        <div><div class="stat-label">Validation admin</div><div style="margin-top:4px">${badgeAdmin}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px;background:var(--fond);border-radius:8px">
        <div><div class="stat-label">Revenus</div><div style="font-weight:700;color:var(--vert)">${formatFG(revenu)}</div></div>
        <div><div class="stat-label">Dépenses</div><div style="font-weight:700;color:var(--rouge)">${formatFG(depense)}</div></div>
        <div><div class="stat-label">Bénéfice</div><div style="font-weight:700;color:${revenu-depense>=0?'var(--vert)':'var(--rouge)'}">${formatFG(revenu-depense)}</div></div>
      </div>
    </div>

    <!-- Tableau courses -->
    <div class="section-header"><div class="section-titre">📦 Courses (${courses.length})</div></div>
    <div style="margin-bottom:16px">
      ${courses.length ? courses.map(c => `
        <div class="item-liste">
          <div class="flex justify-between items-center">
            <div style="flex:1;min-width:0">
              <div class="item-titre" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.depart} → ${c.arrivee}</div>
              <div class="item-sous">${formatDate(c.date_course)} · ${c.client || '—'}</div>
              <div class="mt-2">${badgeStatut(c.statut, false)}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:12px">
              <div class="item-montant vert">${formatFG(c.montant_facture)}</div>
              ${!c.mois_valide ? `
                <div style="margin-top:6px;display:flex;gap:4px;justify-content:flex-end">
                  <button class="btn btn-secondary btn-sm" style="padding:5px 8px" onclick='ouvrirEditCourseValidation(${JSON.stringify(c).replace(/'/g,"\'")})'> ✏️</button>
                  <button class="btn btn-danger btn-sm" style="padding:5px 8px" onclick="supprimerCourseValidation('${c.id}')">🗑️</button>
                </div>` : '<div style="margin-top:4px"><span class=\"badge badge-verrouillee\" style=\"font-size:0.7rem\">🔒</span></div>'}
            </div>
          </div>
        </div>`).join('')
      : '<div class="empty-state" style="padding:24px 0"><div class="icone" style="font-size:2rem">📦</div><p>Aucune course ce mois</p></div>'}
    </div>

    <!-- Tableau dépenses -->
    <div class="section-header"><div class="section-titre">💸 Dépenses (${depenses.length})</div></div>
    <div style="margin-bottom:24px">
      ${depenses.length ? depenses.map(d => `
        <div class="item-liste">
          <div class="flex justify-between items-center">
            <div style="flex:1;min-width:0">
              <div class="item-titre">${labelCategorie(d.categorie)}</div>
              <div class="item-sous">${d.description || ''} · ${formatDate(d.date_depense)}</div>
              ${d.photo_url ? `<div class="mt-2"><a href="${d.photo_url}" target="_blank" style="color:var(--orange);font-size:0.8rem">📷 Voir reçu</a></div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:12px">
              <div class="item-montant rouge">${formatFG(d.montant)}</div>
              ${!d.mois_valide ? `
                <div style="margin-top:6px;display:flex;gap:4px;justify-content:flex-end">
                  <button class="btn btn-secondary btn-sm" style="padding:5px 8px" onclick='ouvrirEditDepenseValidation(${JSON.stringify(d).replace(/'/g,"\'")})'> ✏️</button>
                  <button class="btn btn-danger btn-sm" style="padding:5px 8px" onclick="supprimerDepenseValidation('${d.id}')">🗑️</button>
                </div>` : '<div style="margin-top:4px"><span class=\"badge badge-verrouillee\" style=\"font-size:0.7rem\">🔒</span></div>'}
            </div>
          </div>
        </div>`).join('')
      : '<div class="empty-state" style="padding:24px 0"><div class="icone" style="font-size:2rem">💸</div><p>Aucune dépense ce mois</p></div>'}
    </div>

    <!-- Boutons validation -->
    ${adminValide
      ? `<div class="alerte alerte-info">🔒 Ce mois a été verrouillé par l'admin.${validation?.notes_admin ? '<br>💬 '+validation.notes_admin : ''}<br><small style="opacity:0.7">Seul l'admin peut déverrouiller.</small></div>`
      : !gerantValide
      ? `<button class="btn btn-primary" onclick="gerantValiderBilan('${camion.id}')">✅ Valider mon bilan du mois</button>`
      : `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-secondary" style="flex-shrink:0" onclick="gerantDevaliderBilan('${validation.id}')">↩️ Annuler ma validation</button>
          <div class="alerte alerte-info" style="margin:0;flex:1;min-width:200px">📨 Bilan soumis à l'admin.</div>
        </div>`
    }`;

  container.innerHTML = html;
}

function selectionnerCamionValidation(id) {
  camionValidationActif = id;
  chargerPageValidation();
}

async function gerantValiderBilan(camionId) {
  if (!confirm('Valider votre bilan du mois ? L\'admin pourra ensuite le confirmer définitivement.')) return;
  try {
    await gerantValiderMois(camionId, ANNEE_ACTUELLE, MOIS_ACTUEL);
    toast('Bilan validé ! En attente de confirmation admin.', 'success');
    chargerPageValidation();
  } catch (err) { toast(err.message || 'Erreur', 'error'); }
}

async function gerantDevaliderBilan(validationId) {
  if (!confirm('Annuler votre validation ? Vous pourrez modifier et revalider.')) return;
  try {
    await gerantDevaliderMois(validationId);
    toast('Validation annulée — vous pouvez modifier vos données.', 'success');
    chargerPageValidation();
  } catch (err) { toast(err.message || 'Erreur', 'error'); }
}

function ouvrirEditCourseValidation(course) {
  ouvrirModalCourse(course);
}

function ouvrirEditDepenseValidation(depense) {
  ouvrirModalDepense(depense);
}

async function supprimerCourseValidation(id) {
  if (!confirm('Supprimer cette course définitivement ?')) return;
  try { await supprimerCourse(id); toast('Course supprimée', 'success'); chargerPageValidation(); }
  catch { toast('Erreur', 'error'); }
}

async function supprimerDepenseValidation(id) {
  if (!confirm('Supprimer cette dépense définitivement ?')) return;
  try { await supprimerDepense(id); toast('Dépense supprimée', 'success'); chargerPageValidation(); }
  catch { toast('Erreur', 'error'); }
}

// ── DEMANDE MODIFICATION ──────────────────────────────────────
function demanderModificationGerant(type, elementId) {
  document.getElementById('demande-type').value       = type;
  document.getElementById('demande-element-id').value = elementId;
  document.getElementById('demande-motif').value      = '';
  document.getElementById('modal-demande-modif').classList.remove('hidden');
}

document.getElementById('btn-fermer-demande')?.addEventListener('click', () => {
  document.getElementById('modal-demande-modif').classList.add('hidden');
});

document.getElementById('form-demande-modif')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const type      = document.getElementById('demande-type').value;
  const elementId = document.getElementById('demande-element-id').value;
  const motif     = document.getElementById('demande-motif').value.trim();
  if (!motif) { toast('Veuillez préciser le motif', 'warning'); return; }
  try {
    await creerDemandeModification(type, elementId, motif);
    toast('Demande envoyée à l\'administrateur', 'success');
    notifDemandeModification?.(type, elementId, motif);
    document.getElementById('modal-demande-modif').classList.add('hidden');
    fermerModalDetailCourse();
    fermerModalDetailDepense();
  } catch { toast('Erreur lors de l\'envoi', 'error'); }
});

// ── PAGE PARAMÈTRES GÉRANT ───────────────────────────────────
function chargerPageParametres() {
  const infoEl = document.getElementById('param-licence-info');
  if (infoEl) infoEl.textContent = `Licence : ${State.licenceCle}`;
  afficherBoutonNotifications?.('notif-container');
}

function ouvrirModalChangerCode() {
  document.getElementById('ancien-code').value    = '';
  document.getElementById('nouveau-code').value   = '';
  document.getElementById('confirmer-code').value = '';
  document.getElementById('modal-changer-code').classList.remove('hidden');
}
function fermerModalChangerCode() { document.getElementById('modal-changer-code').classList.add('hidden'); }

document.getElementById('form-changer-code')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ancien    = document.getElementById('ancien-code').value;
  const nouveau   = document.getElementById('nouveau-code').value;
  const confirmer = document.getElementById('confirmer-code').value;
  if (nouveau !== confirmer) { toast('Les codes ne correspondent pas', 'error'); return; }
  if (!/^\d{6}$/.test(nouveau)) { toast('Le code doit être 6 chiffres', 'error'); return; }
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    await changerCodeGerant(State.utilisateur.id, ancien, nouveau);
    toast('Code changé avec succès !', 'success');
    fermerModalChangerCode();
  } catch (err) {
    toast(err.message || 'Erreur', 'error');
  } finally { btn.disabled = false; btn.textContent = 'Changer le code'; }
});

function confirmerViderCache() { document.getElementById('modal-confirmer-cache').classList.remove('hidden'); }
function fermerConfirmerCache() { document.getElementById('modal-confirmer-cache').classList.add('hidden'); }
async function executerViderCache() {
  await viderCache();
  toast('Cache vidé ! Rechargement…', 'success');
  setTimeout(() => location.reload(), 1200);
}
