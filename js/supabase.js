// ============================================================
//  AICHA LOGISTIQUE — supabase.js v2
//  Rôles : Admin + Gérant
//
//  ⚠️  Les clés Supabase sont chargées depuis /api/config
//  (Cloudflare Pages Function) — elles ne sont PAS dans ce fichier.
//  Pour le développement local, configurer les variables dans
//  Cloudflare Pages dashboard ou wrangler.toml.
// ============================================================

// Variables initialisées après le chargement de la config
const SUPABASE_URL = 'https://pyfspbekddnuobdaxhwi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZnNwYmVrZGRudW9iZGF4aHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Mjc4ODUsImV4cCI6MjA5NDUwMzg4NX0.tkVCCwahC4rgJXO7TxiAmoVQepIESwtiXzBzNrX_3aQ';

const STORAGE_LICENCE = 'aicha_licence';
const STORAGE_USER    = 'aicha_user';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Charge la config depuis /api/config (Cloudflare Pages Function)
 * et initialise le client Supabase.
 * À appeler une seule fois au démarrage de l'app.
 */
async function initSupabase() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Impossible de charger la configuration');
    const config = await res.json();
    SUPABASE_URL = config.supabaseUrl;
    SUPABASE_KEY = config.supabaseKey;
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  } catch (err) {
    console.error('[Aicha] Erreur initialisation Supabase :', err);
    return false;
  }
}

// ── État global ──────────────────────────────────────────────
const State = {
  licenceCle:    null,
  nomEntreprise: null,
  utilisateur:   null, // { id, nom, prenom, role: 'admin'|'gerant', ... }
  camions:       [],
  gerants:       [],
};

// ── Formatage ────────────────────────────────────────────────
function formatFG(montant) {
  if (!montant && montant !== 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(montant) + ' FG';
}
function parseFG(str) {
  return parseInt(String(str).replace(/\s/g, '').replace(/FG/g, '')) || 0;
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function nomMois(n) {
  return ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][n-1] || '';
}
function dateAujourdhui() { return new Date().toISOString().split('T')[0]; }
function moisActuel()     { return new Date().getMonth() + 1; }
function anneeActuelle()  { return new Date().getFullYear(); }
function debutMois(annee, mois) {
  return `${annee}-${String(mois).padStart(2,'0')}-01`;
}
function finMois(annee, mois) {
  const d = new Date(annee, mois, 0);
  return d.toISOString().split('T')[0];
}

// ── Toast ────────────────────────────────────────────────────
function toast(message, type = 'default', duree = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), duree);
}

// ── LICENCE ──────────────────────────────────────────────────
async function verifierLicence(cle) {
  const { data, error } = await sb.from('licences').select('*')
    .eq('cle', cle.trim().toUpperCase()).eq('actif', true).single();
  if (error || !data) return null;
  if (data.date_expiration && new Date(data.date_expiration) < new Date()) return null;
  return data;
}
async function verifierAuDemarrage() {
  const cleSauvee = localStorage.getItem(STORAGE_LICENCE);
  if (!cleSauvee) return false;
  if (!navigator.onLine) {
    State.licenceCle    = cleSauvee;
    State.nomEntreprise = localStorage.getItem('aicha_nom_entreprise') || 'Aicha Logistique';
    return true;
  }
  try {
    const licence = await verifierLicence(cleSauvee);
    if (!licence) { localStorage.removeItem(STORAGE_LICENCE); return false; }
    State.licenceCle    = licence.cle;
    State.nomEntreprise = licence.nom_entreprise;
    localStorage.setItem('aicha_nom_entreprise', licence.nom_entreprise);
    return true;
  } catch {
    State.licenceCle    = cleSauvee;
    State.nomEntreprise = localStorage.getItem('aicha_nom_entreprise') || 'Aicha Logistique';
    return true;
  }
}
async function activerLicence(cle) {
  const licence = await verifierLicence(cle);
  if (!licence) return false;
  State.licenceCle    = licence.cle;
  State.nomEntreprise = licence.nom_entreprise;
  localStorage.setItem(STORAGE_LICENCE, cle.trim().toUpperCase());
  localStorage.setItem('aicha_nom_entreprise', licence.nom_entreprise);
  return true;
}

// ── AUTH ADMIN ───────────────────────────────────────────────
async function connexionAdmin(username, code) {
  const { data, error } = await sb.from('admins').select('*')
    .eq('licence_cle', State.licenceCle)
    .eq('username', username.trim().toLowerCase())
    .eq('code', code).single();
  if (error || !data) return null;
  const user = { id: data.id, nom: data.username, prenom: '', role: 'admin', camion_id: null };
  State.utilisateur = user;
  localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  return user;
}

async function changerCodeAdmin(adminId, ancienCode, nouveauCode) {
  const { data } = await sb.from('admins').select('id').eq('id', adminId).eq('code', ancienCode).single();
  if (!data) throw new Error('Ancien code incorrect');
  if (!/^\d{6}$/.test(nouveauCode)) throw new Error('Le nouveau code doit être 6 chiffres');
  const { error } = await sb.from('admins').update({ code: nouveauCode, updated_at: new Date().toISOString() }).eq('id', adminId);
  if (error) throw new Error('Erreur lors du changement de code');
  return true;
}

// ── AUTH GÉRANT ──────────────────────────────────────────────
async function connexionGerant(code) {
  const { data, error } = await sb.from('gerants').select('*')
    .eq('licence_cle', State.licenceCle).eq('pin', code).eq('actif', true).single();
  if (error || !data) return null;
  const user = { id: data.id, nom: data.nom, prenom: data.prenom || '', role: 'gerant' };
  State.utilisateur = user;
  localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  return user;
}

async function changerCodeGerant(gerantId, ancienCode, nouveauCode) {
  const { data } = await sb.from('gerants').select('id').eq('id', gerantId).eq('pin', ancienCode).single();
  if (!data) throw new Error('Ancien code incorrect');
  if (!/^\d{6}$/.test(nouveauCode)) throw new Error('Le nouveau code doit être 6 chiffres');
  const { error } = await sb.from('gerants').update({ pin: nouveauCode, updated_at: new Date().toISOString() }).eq('id', gerantId);
  if (error) throw new Error('Erreur lors du changement de code');
  return true;
}

// ── SESSION ──────────────────────────────────────────────────
function recupererSessionUser() {
  const saved = localStorage.getItem(STORAGE_USER);
  if (!saved) return null;
  try { State.utilisateur = JSON.parse(saved); return State.utilisateur; }
  catch { return null; }
}
function deconnexion() {
  State.utilisateur = null;
  localStorage.removeItem(STORAGE_USER);
}
async function viderCache() {
  const licence = localStorage.getItem(STORAGE_LICENCE);
  const nomEntreprise = localStorage.getItem('aicha_nom_entreprise');
  localStorage.clear(); sessionStorage.clear();
  if (licence) localStorage.setItem(STORAGE_LICENCE, licence);
  if (nomEntreprise) localStorage.setItem('aicha_nom_entreprise', nomEntreprise);
  if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
}

// ── CAMIONS ──────────────────────────────────────────────────
async function chargerCamions() {
  const { data } = await sb.from('camions').select('*').eq('licence_cle', State.licenceCle).order('immatriculation');
  State.camions = data || [];
  return State.camions;
}
async function creerCamion(payload) {
  const { data, error } = await sb.from('camions').insert({ ...payload, licence_cle: State.licenceCle }).select().single();
  if (error) throw error; return data;
}
async function modifierCamion(id, payload) {
  const { data, error } = await sb.from('camions').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error; return data;
}

// ── GÉRANTS (gestion admin) ──────────────────────────────────
async function chargerGerants() {
  const { data } = await sb.from('gerants').select('*').eq('licence_cle', State.licenceCle).order('nom');
  State.gerants = data || [];
  return State.gerants;
}
async function creerGerant(payload) {
  const { data, error } = await sb.from('gerants').insert({ ...payload, licence_cle: State.licenceCle }).select().single();
  if (error) throw error; return data;
}
async function modifierGerant(id, payload) {
  const { data, error } = await sb.from('gerants').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error; return data;
}

// ── COURSES ──────────────────────────────────────────────────
async function chargerCourses(filtres = {}) {
  let q = sb.from('courses').select('*, camions(immatriculation)')
    .eq('licence_cle', State.licenceCle).order('date_course', { ascending: false });
  if (filtres.camion_id)   q = q.eq('camion_id', filtres.camion_id);
  if (filtres.gerant_id)   q = q.eq('gerant_id', filtres.gerant_id);
  if (filtres.statut)      q = q.eq('statut', filtres.statut);
  if (filtres.date_debut)  q = q.gte('date_course', filtres.date_debut);
  if (filtres.date_fin)    q = q.lte('date_course', filtres.date_fin);
  if (filtres.mois_valide !== undefined) q = q.eq('mois_valide', filtres.mois_valide);
  const { data } = await q;
  return data || [];
}

async function chargerCoursesMois(annee, mois, camionId = null) {
  const debut = debutMois(annee, mois);
  const fin   = finMois(annee, mois);
  return chargerCourses({ date_debut: debut, date_fin: fin, camion_id: camionId });
}

async function creerCourse(payload) {
  const { data, error } = await sb.from('courses').insert({
    ...payload,
    licence_cle: State.licenceCle,
    gerant_id: State.utilisateur?.id || null,
    statut: 'en_cours',
    locked: false,
    mois_valide: false,
  }).select().single();
  if (error) throw error; return data;
}

async function modifierCourse(id, payload) {
  const { data, error } = await sb.from('courses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error; return data;
}

async function supprimerCourse(id) {
  const { error } = await sb.from('courses').delete().eq('id', id);
  if (error) throw error;
}

async function mettreAJourStatutCourse(id, statut, extras = {}) {
  const updates = { statut, updated_at: new Date().toISOString(), ...extras };
  // Flux simplifié : en_cours → payee directement (livraison + paiement en une fois)
  if (statut === 'payee') {
    updates.date_livraison = new Date().toISOString();
    updates.date_paiement  = new Date().toISOString();
    updates.locked         = true;
  }
  const { data, error } = await sb.from('courses').update(updates).eq('id', id).select().single();
  if (error) throw error; return data;
}

// ── DÉPENSES ─────────────────────────────────────────────────
async function chargerDepenses(filtres = {}) {
  let q = sb.from('depenses').select('*, camions(immatriculation)')
    .eq('licence_cle', State.licenceCle).order('date_depense', { ascending: false });
  if (filtres.camion_id)   q = q.eq('camion_id', filtres.camion_id);
  if (filtres.gerant_id)   q = q.eq('gerant_id', filtres.gerant_id);
  if (filtres.date_debut)  q = q.gte('date_depense', filtres.date_debut);
  if (filtres.date_fin)    q = q.lte('date_depense', filtres.date_fin);
  if (filtres.mois_valide !== undefined) q = q.eq('mois_valide', filtres.mois_valide);
  const { data } = await q;
  return data || [];
}

async function chargerDepensesMois(annee, mois, camionId = null) {
  const debut = debutMois(annee, mois);
  const fin   = finMois(annee, mois);
  return chargerDepenses({ date_debut: debut, date_fin: fin, camion_id: camionId });
}

async function creerDepense(payload) {
  const { data, error } = await sb.from('depenses').insert({
    ...payload,
    licence_cle: State.licenceCle,
    gerant_id: State.utilisateur?.id || null,
    locked: false,
    mois_valide: false,
  }).select().single();
  if (error) throw error; return data;
}

async function modifierDepense(id, payload) {
  const { data, error } = await sb.from('depenses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error; return data;
}

async function supprimerDepense(id) {
  const { error } = await sb.from('depenses').delete().eq('id', id);
  if (error) throw error;
}

async function verrouillerDepense(id) {
  const { data, error } = await sb.from('depenses').update({ locked: true, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error; return data;
}

// ── VALIDATIONS MENSUELLES ───────────────────────────────────
async function chargerValidationsMois(annee, mois) {
  const { data } = await sb.from('validations_mensuelles').select('*, camions(immatriculation)')
    .eq('licence_cle', State.licenceCle).eq('annee', annee).eq('mois', mois);
  return data || [];
}

async function chargerValidationCamion(camionId, annee, mois) {
  const { data } = await sb.from('validations_mensuelles').select('*')
    .eq('licence_cle', State.licenceCle).eq('camion_id', camionId).eq('annee', annee).eq('mois', mois).single();
  return data || null;
}

async function demanderValidationMois(camionId, annee, mois) { // Alias vers gerantValiderMois
  return gerantValiderMois(camionId, annee, mois);
}
async function _demanderValidationMoisOld(camionId, annee, mois) {
  // Calculer les totaux
  const courses  = await chargerCoursesMois(annee, mois, camionId);
  const depenses = await chargerDepensesMois(annee, mois, camionId);
  const totalRevenus  = courses.reduce((s, c) => s + (Number(c.montant_facture) || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);

  const payload = {
    licence_cle:    State.licenceCle,
    camion_id:      camionId,
    annee, mois,
    statut:         'demandee',
    total_revenus:  totalRevenus,
    total_depenses: totalDepenses,
    benefice_net:   totalRevenus - totalDepenses,
    demandee_par:   State.utilisateur.id,
    demandee_at:    new Date().toISOString(),
  };

  const { data, error } = await sb.from('validations_mensuelles')
    .upsert(payload, { onConflict: 'licence_cle,camion_id,annee,mois' }).select().single();
  if (error) throw error;
  return data;
}

// ── Gérant valide son bilan ──────────────────────────────────
async function gerantValiderMois(camionId, annee, mois) {
  const courses  = await chargerCoursesMois(annee, mois, camionId);
  const depenses = await chargerDepensesMois(annee, mois, camionId);
  const totalRevenus  = courses.reduce((s, c) => s + (Number(c.montant_facture) || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);

  const payload = {
    licence_cle:    State.licenceCle,
    camion_id:      camionId,
    annee, mois,
    statut:         'demandee',
    total_revenus:  totalRevenus,
    total_depenses: totalDepenses,
    benefice_net:   totalRevenus - totalDepenses,
    demandee_par:   State.utilisateur.id,
    demandee_at:    new Date().toISOString(),
    gerant_valide:  true,
    gerant_valide_at: new Date().toISOString(),
    admin_valide:   false,
  };

  const { data, error } = await sb.from('validations_mensuelles')
    .upsert(payload, { onConflict: 'licence_cle,camion_id,annee,mois' }).select().single();
  if (error) throw error;
  return data;
}

// ── Gérant dé-valide son bilan ───────────────────────────────
async function gerantDevaliderMois(validationId) {
  const { data, error } = await sb.from('validations_mensuelles').update({
    statut:          'en_attente',
    gerant_valide:   false,
    gerant_valide_at: null,
    updated_at:      new Date().toISOString(),
  }).eq('id', validationId).select().single();
  if (error) throw error;
  return data;
}

// ── Admin valide définitivement ──────────────────────────────
async function validerMois(validationId, camionId, annee, mois, notesAdmin = '') {
  const debut = debutMois(annee, mois);
  const fin   = finMois(annee, mois);

  // Verrouiller toutes les données du mois
  await sb.from('courses').update({ mois_valide: true, locked: true })
    .eq('licence_cle', State.licenceCle).eq('camion_id', camionId)
    .gte('date_course', debut).lte('date_course', fin);

  await sb.from('depenses').update({ mois_valide: true, locked: true })
    .eq('licence_cle', State.licenceCle).eq('camion_id', camionId)
    .gte('date_depense', debut).lte('date_depense', fin);

  const { data, error } = await sb.from('validations_mensuelles').update({
    statut:       'validee',
    validee_par:  'admin',
    validee_at:   new Date().toISOString(),
    notes_admin:  notesAdmin,
    admin_valide: true,
    admin_valide_at: new Date().toISOString(),
  }).eq('id', validationId).select().single();
  if (error) throw error;
  return data;
}

// ── CLÔTURES ANNUELLES ───────────────────────────────────────
async function chargerAnnees() {
  const { data } = await sb.from('clotures_annuelles').select('*')
    .eq('licence_cle', State.licenceCle).order('annee', { ascending: false });
  return data || [];
}

async function creerAnnee(annee) {
  const { data, error } = await sb.from('clotures_annuelles').insert({
    licence_cle: State.licenceCle,
    annee,
    cloturee: false,
  }).select().single();
  if (error) throw error;
  return data;
}

async function cloturerAnnee(annee) {
  // Calculer les totaux de l'année
  const debut = `${annee}-01-01`;
  const fin   = `${annee}-12-31`;
  const courses  = await chargerCourses({ date_debut: debut, date_fin: fin });
  const depenses = await chargerDepenses({ date_debut: debut, date_fin: fin });
  const totalRevenus  = courses.reduce((s, c)  => s + (Number(c.montant_facture) || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);

  // Verrouiller toutes les données de l'année
  await sb.from('courses').update({ annee_cloturee: true, locked: true, mois_valide: true })
    .eq('licence_cle', State.licenceCle).gte('date_course', debut).lte('date_course', fin);
  await sb.from('depenses').update({ annee_cloturee: true, locked: true, mois_valide: true })
    .eq('licence_cle', State.licenceCle).gte('date_depense', debut).lte('date_depense', fin);

  // Mettre à jour la clôture
  const { data, error } = await sb.from('clotures_annuelles').update({
    cloturee:        true,
    cloturee_at:     new Date().toISOString(),
    total_revenus:   totalRevenus,
    total_depenses:  totalDepenses,
    benefice_net:    totalRevenus - totalDepenses,
  }).eq('licence_cle', State.licenceCle).eq('annee', annee).select().single();
  if (error) throw error;
  return data;
}

// ── STATS ────────────────────────────────────────────────────
async function calcStatsGlobales(dateDebut, dateFin) {
  const [courses, depenses] = await Promise.all([
    chargerCourses({ date_debut: dateDebut, date_fin: dateFin }),
    chargerDepenses({ date_debut: dateDebut, date_fin: dateFin }),
  ]);
  const totalRevenu      = courses.reduce((s, c) => s + (Number(c.montant_facture) || 0), 0);
  const totalDepense     = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const coursesEnAttente = courses.filter(c => c.statut !== 'payee').length;
  return { totalRevenu, totalDepense, benefice: totalRevenu - totalDepense, courses, depenses, coursesEnAttente };
}

async function calcStatsCamion(camionId, dateDebut, dateFin) {
  const [courses, depenses] = await Promise.all([
    chargerCourses({ camion_id: camionId, date_debut: dateDebut, date_fin: dateFin }),
    chargerDepenses({ camion_id: camionId, date_debut: dateDebut, date_fin: dateFin }),
  ]);
  const revenu  = courses.reduce((s, c) => s + (Number(c.montant_facture) || 0), 0);
  const depense = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);
  return { revenu, depense, benefice: revenu - depense, nbCourses: courses.length, courses, depenses };
}

// ── UPLOAD PHOTO ─────────────────────────────────────────────
async function compresserImage(file, maxLargeur = 1200, qualite = 0.75) {
  return new Promise((resolve) => {
    if (file.size < 300 * 1024) { resolve(file); return; }
    const img = new Image(); const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxLargeur) { height = Math.round(height * maxLargeur / width); width = maxLargeur; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', qualite);
      };
    };
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(file) {
  const fichierFinal = await compresserImage(file);
  const nom = `recus/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await sb.storage.from('recus').upload(nom, fichierFinal, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
  if (error) throw error;
  const { data: urlData } = sb.storage.from('recus').getPublicUrl(nom);
  return urlData.publicUrl;
}

// ── DEMANDES MODIFICATION ────────────────────────────────────
async function chargerDemandesModification() {
  const { data } = await sb.from('demandes_modification')
    .select('*, conducteur_id, conducteurs(nom, prenom)')
    .eq('licence_cle', State.licenceCle).eq('statut', 'en_attente')
    .order('created_at', { ascending: false });
  return data || [];
}
async function creerDemandeModification(typeElement, elementId, motif) {
  const { data, error } = await sb.from('demandes_modification').insert({
    licence_cle: State.licenceCle, conducteur_id: State.utilisateur.id,
    type_element: typeElement, element_id: elementId, motif, statut: 'en_attente',
  }).select().single();
  if (error) throw error; return data;
}
async function traiterDemandeModification(demandeId, approuvee, elementId, typeElement) {
  await sb.from('demandes_modification').update({
    statut: approuvee ? 'approuvee' : 'refusee', traitee_at: new Date().toISOString(),
  }).eq('id', demandeId);
  if (approuvee) {
    const table = typeElement === 'course' ? 'courses' : 'depenses';
    await sb.from(table).update({ locked: false }).eq('id', elementId);
  }
}

// ── Utilitaires ──────────────────────────────────────────────
function labelCategorie(cat) {
  return { carburant:'⛽ Carburant', reparation:'🔧 Réparation', peage:'🛣️ Péage', repas:'🍽️ Repas', autre:'📦 Autre' }[cat] || cat;
}
function badgeStatut(statut, locked) {
  if (locked) return '<span class="badge badge-verrouillee">🔒 Verrouillée</span>';
  return { en_cours:'<span class="badge badge-en-cours">🔵 En cours</span>', payee:'<span class="badge badge-payee">🟢 Payée</span>' }[statut] || statut;
}
