// ============================================================
//  AICHA LOGISTIQUE — offline-queue.js
//  File d'attente locale : stocke les actions hors ligne
//  et les rejoue automatiquement au retour du réseau
// ============================================================

const QUEUE_KEY   = 'aicha_offline_queue';
const ONLINE_KEY  = 'aicha_online_status';

// ── État réseau ──────────────────────────────────────────────
let estEnLigne = navigator.onLine;

function setStatutReseau(enLigne) {
  estEnLigne = enLigne;
  localStorage.setItem(ONLINE_KEY, enLigne ? '1' : '0');
  afficherIndicateurReseau(enLigne);
}

function afficherIndicateurReseau(enLigne) {
  let indicateur = document.getElementById('indicateur-reseau');

  if (!indicateur) {
    indicateur = document.createElement('div');
    indicateur.id = 'indicateur-reseau';
    indicateur.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9999;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 16px;
      transition: all 0.3s;
      pointer-events: none;
    `;
    document.body.prepend(indicateur);
  }

  const nbActions = lireQueue().length;

  if (enLigne) {
    if (nbActions > 0) {
      indicateur.style.background = '#22C55E';
      indicateur.style.color = '#fff';
      indicateur.textContent = `✅ Connexion rétablie — synchronisation en cours…`;
      indicateur.style.display = 'block';
      setTimeout(() => { indicateur.style.display = 'none'; }, 4000);
    } else {
      indicateur.style.display = 'none';
    }
  } else {
    indicateur.style.background = '#EF4444';
    indicateur.style.color = '#fff';
    indicateur.textContent = nbActions > 0
      ? `📴 Hors ligne — ${nbActions} action(s) en attente de synchronisation`
      : `📴 Hors ligne — les modifications seront sauvegardées localement`;
    indicateur.style.display = 'block';
  }
}

function mettreAJourIndicateur() {
  afficherIndicateurReseau(estEnLigne);
}

// ── Gestion de la file ───────────────────────────────────────
function lireQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

function sauvegarderQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function ajouterALaQueue(action) {
  const queue = lireQueue();
  queue.push({
    id:        Date.now() + '_' + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    ...action,
  });
  sauvegarderQueue(queue);
  mettreAJourIndicateur();
  console.log('[Offline] Action mise en file :', action.type, action.table);
}

function supprimerDeLaQueue(id) {
  const queue = lireQueue().filter(a => a.id !== id);
  sauvegarderQueue(queue);
}

// ── Rejouer la file au retour du réseau ──────────────────────
async function rejouerQueue() {
  const queue = lireQueue();
  if (!queue.length) return;

  console.log(`[Offline] Rejoue ${queue.length} action(s)…`);

  for (const action of queue) {
    try {
      await executerAction(action);
      supprimerDeLaQueue(action.id);
      console.log('[Offline] Action synchronisée :', action.type, action.table);
    } catch (err) {
      console.error('[Offline] Échec sync action :', action.type, err);
      // On arrête pour garder l'ordre — sera réessayé plus tard
      break;
    }
  }

  const restantes = lireQueue().length;
  if (restantes === 0) {
    toast('Toutes les modifications ont été synchronisées !', 'success', 4000);
    // Rafraîchir les données affichées
    if (typeof afficherOnglet === 'function') {
      const ongletActif = document.querySelector('.nav-item.actif')?.dataset?.onglet;
      if (ongletActif) afficherOnglet(ongletActif);
    }
  } else {
    toast(`${restantes} action(s) en attente de synchronisation`, 'warning');
  }

  mettreAJourIndicateur();
}

// ── Exécuter une action depuis la file ───────────────────────
async function executerAction(action) {
  const { type, table, payload, id: actionId, recordId } = action;

  switch (type) {
    case 'INSERT': {
      const { data, error } = await sb.from(table).insert(payload).select().single();
      if (error) throw error;
      return data;
    }
    case 'UPDATE': {
      const { data, error } = await sb.from(table).update(payload).eq('id', recordId).select().single();
      if (error) throw error;
      return data;
    }
    case 'DELETE': {
      const { error } = await sb.from(table).delete().eq('id', recordId);
      if (error) throw error;
      return true;
    }
    default:
      throw new Error(`Type d'action inconnu : ${type}`);
  }
}

// ── Wrapper : opération avec fallback offline ─────────────────
async function operationAvecFallback(config) {
  const { table, type, payload, recordId, donneeLocale, onSuccess } = config;

  if (estEnLigne) {
    // En ligne : exécution directe
    try {
      const resultat = await executerAction({ type, table, payload, recordId });
      if (onSuccess) onSuccess(resultat);
      return resultat;
    } catch (err) {
      // Si erreur réseau malgré online=true, basculer en offline
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        setStatutReseau(false);
        return operationAvecFallback(config);
      }
      throw err;
    }
  } else {
    // Hors ligne : stocker dans la file
    ajouterALaQueue({ type, table, payload, recordId });

    // Retourner une donnée fictive pour l'UI
    const donneeUI = donneeLocale || {
      id: 'offline_' + Date.now(),
      ...payload,
      _offline: true,
    };

    toast('💾 Sauvegardé localement — sera synchronisé au retour du réseau', 'warning', 4000);
    if (onSuccess) onSuccess(donneeUI);
    return donneeUI;
  }
}

// ── Wrappers pour chaque type d'opération ────────────────────

// Créer une course (avec fallback offline)
async function creerCourseOffline(payload) {
  return operationAvecFallback({
    type: 'INSERT',
    table: 'courses',
    payload: {
      ...payload,
      licence_cle: State.licenceCle,
      statut: 'en_cours',
      locked: false,
    },
    donneeLocale: {
      id: 'offline_' + Date.now(),
      ...payload,
      licence_cle: State.licenceCle,
      statut: 'en_cours',
      locked: false,
      _offline: true,
    },
  });
}

// Créer une dépense (avec fallback offline)
async function creerDepenseOffline(payload) {
  return operationAvecFallback({
    type: 'INSERT',
    table: 'depenses',
    payload: {
      ...payload,
      licence_cle: State.licenceCle,
      locked: false,
    },
    donneeLocale: {
      id: 'offline_' + Date.now(),
      ...payload,
      licence_cle: State.licenceCle,
      locked: false,
      _offline: true,
    },
  });
}

// Mettre à jour le statut d'une course (avec fallback offline)
async function mettreAJourStatutCourseOffline(id, statut, extras = {}) {
  const updates = { statut, updated_at: new Date().toISOString(), ...extras };
  if (statut === 'livree')  updates.date_livraison = new Date().toISOString();
  if (statut === 'payee') { updates.date_paiement = new Date().toISOString(); updates.locked = true; }

  return operationAvecFallback({
    type: 'UPDATE',
    table: 'courses',
    recordId: id,
    payload: updates,
    donneeLocale: { id, ...updates, _offline: true },
  });
}

// Verrouiller une dépense (avec fallback offline)
async function verrouillerDepenseOffline(id) {
  return operationAvecFallback({
    type: 'UPDATE',
    table: 'depenses',
    recordId: id,
    payload: { locked: true, updated_at: new Date().toISOString() },
    donneeLocale: { id, locked: true, _offline: true },
  });
}

// ── Cache local des données lues ─────────────────────────────
const CACHE_COURSES_KEY  = 'aicha_cache_courses';
const CACHE_DEPENSES_KEY = 'aicha_cache_depenses';

function sauvegarderCacheLocal(cle, donnees) {
  try {
    localStorage.setItem(cle, JSON.stringify({
      timestamp: Date.now(),
      donnees,
    }));
  } catch (e) {
    // localStorage plein — ignorer
    console.warn('[Offline] Cache local plein');
  }
}

function lireCacheLocal(cle, maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(cle);
    if (!raw) return null;
    const { timestamp, donnees } = JSON.parse(raw);
    if (Date.now() - timestamp > maxAgeMs) return null; // cache expiré
    return donnees;
  } catch { return null; }
}

// Charger courses avec fallback cache local
async function chargerCoursesConducteurOffline(conducteurId) {
  if (estEnLigne) {
    try {
      const donnees = await chargerCoursesConducteur(conducteurId);
      sauvegarderCacheLocal(CACHE_COURSES_KEY + '_' + conducteurId, donnees);
      return donnees;
    } catch {
      return lireCacheLocal(CACHE_COURSES_KEY + '_' + conducteurId) || [];
    }
  } else {
    const cache = lireCacheLocal(CACHE_COURSES_KEY + '_' + conducteurId);
    if (cache) return cache;
    return [];
  }
}

// Charger dépenses avec fallback cache local
async function chargerDepensesConducteurOffline(conducteurId) {
  if (estEnLigne) {
    try {
      const donnees = await chargerDepensesConducteur(conducteurId);
      sauvegarderCacheLocal(CACHE_DEPENSES_KEY + '_' + conducteurId, donnees);
      return donnees;
    } catch {
      return lireCacheLocal(CACHE_DEPENSES_KEY + '_' + conducteurId) || [];
    }
  } else {
    const cache = lireCacheLocal(CACHE_DEPENSES_KEY + '_' + conducteurId);
    if (cache) return cache;
    return [];
  }
}

// ── Écouteurs réseau ─────────────────────────────────────────
window.addEventListener('online', async () => {
  console.log('[Offline] Réseau rétabli');
  setStatutReseau(true);
  await rejouerQueue();
});

window.addEventListener('offline', () => {
  console.log('[Offline] Réseau perdu');
  setStatutReseau(false);
});

// ── Vérification licence offline-safe ────────────────────────
// Override de verifierAuDemarrage pour ne pas redemander la licence hors ligne
const _verifierAuDemarrage_original = verifierAuDemarrage;
window.verifierAuDemarrage = async function() {
  const cleSauvee = localStorage.getItem('aicha_licence');
  if (!cleSauvee) return false;

  // Si hors ligne et licence en cache → OK direct, pas de vérification réseau
  if (!navigator.onLine) {
    const nomEntreprise = localStorage.getItem('aicha_nom_entreprise') || 'Aicha Logistique';
    State.licenceCle    = cleSauvee;
    State.nomEntreprise = nomEntreprise;
    console.log('[Offline] Licence acceptée depuis cache local');
    return true;
  }

  // En ligne → vérification normale
  try {
    const ok = await _verifierAuDemarrage_original();
    if (ok) {
      // Mettre en cache le nom de l'entreprise pour l'offline
      localStorage.setItem('aicha_nom_entreprise', State.nomEntreprise || '');
    }
    return ok;
  } catch {
    // Erreur réseau → accepter depuis cache
    State.licenceCle    = cleSauvee;
    State.nomEntreprise = localStorage.getItem('aicha_nom_entreprise') || 'Aicha Logistique';
    return true;
  }
};

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setStatutReseau(navigator.onLine);

  // Vérifier la file au démarrage si on est en ligne
  if (navigator.onLine) {
    const queue = lireQueue();
    if (queue.length > 0) {
      console.log(`[Offline] ${queue.length} action(s) en attente au démarrage — synchronisation…`);
      setTimeout(rejouerQueue, 2000); // Attendre que l'app soit prête
    }
  }
});
