// ============================================================
//  AICHA LOGISTIQUE — notifications.js
//  Push Notifications : abonnement, envoi, réception
// ============================================================

const VAPID_PUBLIC_KEY = 'BPcGaxASd5-9V2kBi95e-i5boBczrdDmIgRqyHdgvqEgo-hQYthttsg3Amit8hcuuK-ROE1hjMZmUAeG58QQ84M';
const EDGE_FUNCTION_URL = 'https://pyfspbekddnuobdaxhwi.supabase.co/functions/v1/send-push';

// ── Convertir clé VAPID base64 → Uint8Array ──────────────────
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Vérifier si les notifications sont supportées ────────────
function notificationsSupportees() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

// ── Demander la permission et s'abonner ──────────────────────
async function abonnerAuxNotifications() {
  if (!notificationsSupportees()) {
    console.warn('[Notif] Non supporté sur cet appareil');
    return false;
  }

  try {
    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Notif] Permission refusée');
      return false;
    }

    // Récupérer le Service Worker actif
    const registration = await navigator.serviceWorker.ready;

    // S'abonner aux push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Sauvegarder l'abonnement en base
    await sauvegarderAbonnement(subscription);
    console.log('[Notif] Abonnement réussi');
    return true;

  } catch (err) {
    console.error('[Notif] Erreur abonnement :', err);
    return false;
  }
}

// ── Sauvegarder l'abonnement dans Supabase ───────────────────
async function sauvegarderAbonnement(subscription) {
  if (!State.utilisateur || !State.licenceCle) return;

  const payload = {
    licence_cle: State.licenceCle,
    user_id:     State.utilisateur.id,
    user_role:   State.utilisateur.role,
    subscription: subscription.toJSON(),
    updated_at:  new Date().toISOString(),
  };

  // Vérifier si abonnement existant pour cet appareil
  const endpoint = subscription.endpoint;
  const { data: existant } = await sb
    .from('push_subscriptions')
    .select('id')
    .eq('licence_cle', State.licenceCle)
    .eq('user_id', State.utilisateur.id)
    .filter('subscription->>endpoint', 'eq', endpoint)
    .single();

  if (existant) {
    await sb.from('push_subscriptions').update(payload).eq('id', existant.id);
  } else {
    await sb.from('push_subscriptions').insert(payload);
  }
}

// ── Vérifier et renouveler l'abonnement au démarrage ─────────
async function verifierAbonnement() {
  if (!notificationsSupportees()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const registration   = await navigator.serviceWorker.ready;
    const subscription   = await registration.pushManager.getSubscription();
    if (subscription) {
      await sauvegarderAbonnement(subscription);
    }
  } catch (err) {
    console.warn('[Notif] Erreur vérification abonnement :', err);
  }
}

// ── Envoyer une notification via Edge Function ───────────────
async function envoyerNotification({ targetRole, targetUserId, titre, corps, data = {} }) {
  if (!estEnLigne) {
    console.warn('[Notif] Hors ligne — notification non envoyée');
    return;
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        licence_cle:    State.licenceCle,
        target_role:    targetRole    || null,
        target_user_id: targetUserId  || null,
        titre,
        corps,
        data,
      }),
    });

    const result = await response.json();
    console.log('[Notif] Envoyée :', result);
    return result;
  } catch (err) {
    console.error('[Notif] Erreur envoi :', err);
  }
}

// ── Notifications métier ─────────────────────────────────────

// Quand un conducteur crée une course
async function notifNouvelleourse(course) {
  const conducteur = `${State.utilisateur.prenom || ''} ${State.utilisateur.nom}`.trim();
  await envoyerNotification({
    targetRole: 'admin',
    titre: '🚛 Nouvelle course',
    corps: `${conducteur} : ${course.depart} → ${course.arrivee}`,
    data:  { type: 'nouvelle_course', courseId: course.id, url: '/admin/index.html#courses' },
  });
}

// Quand un conducteur crée une dépense
async function notifNouvelleDepense(depense) {
  const conducteur = `${State.utilisateur.prenom || ''} ${State.utilisateur.nom}`.trim();
  const categorie  = labelCategorieNotif(depense.categorie);
  await envoyerNotification({
    targetRole: 'admin',
    titre: '💸 Nouvelle dépense',
    corps: `${conducteur} : ${categorie} — ${formatFG(depense.montant)}`,
    data:  { type: 'nouvelle_depense', depenseId: depense.id, url: '/admin/index.html#depenses' },
  });
}

// Quand un conducteur fait une demande de modification
async function notifDemandeModification(typeElement, elementId, motif) {
  const conducteur = `${State.utilisateur.prenom || ''} ${State.utilisateur.nom}`.trim();
  await envoyerNotification({
    targetRole: 'admin',
    titre: '🔓 Demande de modification',
    corps: `${conducteur} souhaite modifier une ${typeElement === 'course' ? 'course' : 'dépense'} : "${motif}"`,
    data:  { type: 'demande_modif', elementId, typeElement, url: '/admin/index.html#demandes' },
  });
}

// Quand l'admin approuve une demande → notif au conducteur
async function notifDemandeApprouvee(conducteurId, typeElement, elementId) {
  await envoyerNotification({
    targetUserId: conducteurId,
    titre: '✅ Modification approuvée',
    corps: `Votre demande a été approuvée. Appuyez pour modifier votre ${typeElement === 'course' ? 'course' : 'dépense'}.`,
    data:  { type: 'demande_approuvee', typeElement, elementId, url: '/' },
  });
}

// Quand l'admin refuse une demande → notif au conducteur
async function notifDemandeRefusee(conducteurId, typeElement) {
  await envoyerNotification({
    targetUserId: conducteurId,
    titre: '❌ Modification refusée',
    corps: `Votre demande de modification de ${typeElement === 'course' ? 'course' : 'dépense'} a été refusée.`,
    data:  { type: 'demande_refusee', typeElement, url: '/' },
  });
}

// ── Utilitaire ───────────────────────────────────────────────
function labelCategorieNotif(cat) {
  return { carburant:'Carburant', reparation:'Réparation', peage:'Péage', repas:'Repas', autre:'Autre' }[cat] || cat;
}

// ── Bouton d'activation dans les paramètres ──────────────────
async function afficherBoutonNotifications(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!notificationsSupportees()) {
    container.innerHTML = `
      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-icone" style="background:rgba(142,142,147,0.1)">🔔</div>
          <div>
            <div class="settings-titre">Notifications</div>
            <div class="settings-sous">Non supporté sur cet appareil</div>
          </div>
        </div>
      </div>`;
    return;
  }

  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const abonne = subscription !== null;

  if (permission === 'denied') {
    container.innerHTML = `
      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-icone rouge">🔕</div>
          <div>
            <div class="settings-titre">Notifications bloquées</div>
            <div class="settings-sous">Activez-les dans les réglages de votre navigateur</div>
          </div>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="settings-item">
      <div class="settings-item-left">
        <div class="settings-icone ${abonne ? 'vert' : 'orange'}">🔔</div>
        <div>
          <div class="settings-titre">Notifications push</div>
          <div class="settings-sous">${abonne ? 'Activées sur cet appareil' : 'Recevez les alertes en temps réel'}</div>
        </div>
      </div>
      <button class="btn-settings-action ${abonne ? 'rouge' : 'orange'}"
        onclick="toggleNotifications(this, ${abonne})">
        ${abonne ? 'Désactiver' : 'Activer'}
      </button>
    </div>`;
}

async function toggleNotifications(btn, etaitAbonne) {
  btn.disabled = true;
  btn.textContent = '…';

  if (etaitAbonne) {
    // Désabonner
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      // Supprimer de Supabase
      await sb.from('push_subscriptions')
        .delete()
        .eq('licence_cle', State.licenceCle)
        .eq('user_id', State.utilisateur.id)
        .filter('subscription->>endpoint', 'eq', subscription.endpoint);
    }
    toast('Notifications désactivées', 'warning');
  } else {
    // Abonner
    const ok = await abonnerAuxNotifications();
    if (ok) {
      toast('Notifications activées ! 🔔', 'success');
    } else {
      toast('Impossible d\'activer les notifications', 'error');
    }
  }

  // Rafraîchir le bouton
  const containerId = btn.closest('[id]')?.id || 'notif-container';
  await afficherBoutonNotifications(containerId);
}
