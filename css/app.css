/* ============================================================
   AICHA LOGISTIQUE — CSS Principal
   Thème : industriel / terrain / Afrique de l'Ouest
   ============================================================ */

/* ── Variables ─────────────────────────────────────────────── */
:root {
  --orange:     #F97316;
  --orange-dk:  #C2500A;
  --orange-lt:  #FEE2CA;
  --noir:       #0F0F0F;
  --gris-fonce: #1C1C1E;
  --gris-moyen: #3A3A3C;
  --gris-clair: #8E8E93;
  --fond:       #F5F5F0;
  --blanc:      #FFFFFF;
  --vert:       #22C55E;
  --rouge:      #EF4444;
  --bleu:       #3B82F6;
  --jaune:      #EAB308;

  --radius:     12px;
  --radius-lg:  20px;
  --shadow:     0 2px 12px rgba(0,0,0,0.08);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.14);

  --font-titre: -apple-system, 'Segoe UI', Arial, sans-serif;
  --font-corps: -apple-system, 'Segoe UI', Arial, sans-serif;
}

/* ── Reset ─────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-tap-highlight-color: transparent; }
body {
  font-family: var(--font-corps);
  background: var(--fond);
  color: var(--noir);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── Utilitaires ───────────────────────────────────────────── */
.hidden { display: none !important; }
.flex { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.w-full { width: 100%; }
.text-center { text-align: center; }
.text-sm { font-size: 0.85rem; }
.text-xs { font-size: 0.75rem; }
.font-bold { font-weight: 700; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }

/* ── Écran de licence ──────────────────────────────────────── */
#ecran-licence {
  position: fixed; inset: 0;
  background: var(--noir);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.licence-card {
  background: var(--gris-fonce);
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.licence-logo {
  font-family: var(--font-titre);
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--orange);
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.licence-sub {
  color: var(--gris-clair);
  font-size: 0.85rem;
  margin-bottom: 32px;
}

/* ── Écran de connexion PIN ────────────────────────────────── */
#ecran-login {
  position: fixed; inset: 0;
  background: var(--noir);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 24px;
}

.login-card {
  background: var(--gris-fonce);
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-logo {
  font-family: var(--font-titre);
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--orange);
  letter-spacing: -1px;
}

.login-subtitle {
  color: var(--gris-clair);
  font-size: 0.85rem;
  margin-bottom: 32px;
  margin-top: 4px;
}

.select-role {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn-role {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius);
  border: 2px solid var(--gris-moyen);
  background: transparent;
  color: var(--gris-clair);
  font-family: var(--font-corps);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-role.actif {
  border-color: var(--orange);
  color: var(--orange);
  background: rgba(249,115,22,0.1);
}

/* Clavier PIN */
.pin-display {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
}

.pin-dot {
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 2px solid var(--gris-moyen);
  background: transparent;
  transition: all 0.2s;
}

.pin-dot.rempli {
  background: var(--orange);
  border-color: var(--orange);
}

.clavier-pin {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 280px;
  margin: 0 auto;
}

.touche-pin {
  aspect-ratio: 1;
  border-radius: var(--radius);
  border: none;
  background: var(--gris-moyen);
  color: var(--blanc);
  font-family: var(--font-titre);
  font-size: 1.4rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.touche-pin:active { transform: scale(0.92); background: var(--orange); }
.touche-pin.effacer { font-size: 1rem; background: var(--rouge); }
.touche-pin.vide { background: transparent; cursor: default; }

/* ── App principale ────────────────────────────────────────── */
#app { display: flex; flex-direction: column; min-height: 100vh; }

/* Header */
.app-header {
  background: var(--noir);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-logo {
  font-family: var(--font-titre);
  font-size: 1.2rem;
  font-weight: 900;
  color: var(--orange);
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--gris-fonce);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 0.8rem;
  color: var(--blanc);
}

.user-badge .role-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--vert);
}

.user-badge .role-dot.admin { background: var(--orange); }

.btn-deconnexion {
  background: var(--gris-moyen);
  border: none;
  color: var(--gris-clair);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-deconnexion:hover { background: var(--rouge); color: var(--blanc); }

/* Navigation bas */
.nav-bas {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--noir);
  display: flex;
  padding: 8px 0 16px;
  z-index: 100;
  border-top: 1px solid var(--gris-moyen);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--gris-clair);
  font-size: 0.7rem;
  font-weight: 500;
  border: none;
  background: transparent;
}

.nav-item svg { width: 22px; height: 22px; }
.nav-item.actif { color: var(--orange); }
.nav-item.actif svg { stroke: var(--orange); }

/* Contenu principal */
.contenu {
  flex: 1;
  padding: 20px 16px 100px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

/* ── Composants UI ─────────────────────────────────────────── */

/* Titre de page */
.page-titre {
  font-family: var(--font-titre);
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--noir);
  margin-bottom: 20px;
}

/* Cards */
.card {
  background: var(--blanc);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow);
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-titre {
  font-family: var(--font-titre);
  font-size: 1rem;
  font-weight: 700;
}

/* Stats dashboard */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--blanc);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--gris-clair);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-family: var(--font-titre);
  font-size: 1.3rem;
  font-weight: 900;
  margin-top: 4px;
  color: var(--noir);
}

.stat-card.vert .stat-value { color: var(--vert); }
.stat-card.rouge .stat-value { color: var(--rouge); }
.stat-card.orange .stat-value { color: var(--orange); }

/* Boutons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: var(--radius);
  border: none;
  font-family: var(--font-corps);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-primary {
  background: var(--orange);
  color: var(--blanc);
  width: 100%;
}

.btn-primary:hover { background: var(--orange-dk); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

.btn-secondary {
  background: var(--fond);
  color: var(--noir);
  border: 1.5px solid #E0E0D8;
  width: 100%;
}

.btn-danger {
  background: var(--rouge);
  color: var(--blanc);
}

.btn-success {
  background: var(--vert);
  color: var(--blanc);
}

.btn-sm {
  padding: 8px 14px;
  font-size: 0.8rem;
  border-radius: 8px;
}

/* Bouton flottant */
.fab {
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--orange);
  color: var(--blanc);
  border: none;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(249,115,22,0.4);
  transition: all 0.2s;
  z-index: 50;
}

.fab:active { transform: scale(0.92); }

/* Formulaires */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--gris-fonce);
  margin-bottom: 6px;
}

.form-label .requis { color: var(--rouge); margin-left: 2px; }

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid #E0E0D8;
  border-radius: var(--radius);
  font-family: var(--font-corps);
  font-size: 0.95rem;
  color: var(--noir);
  background: var(--blanc);
  transition: border-color 0.2s;
  appearance: none;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--orange);
  box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
}

.form-textarea { resize: vertical; min-height: 80px; }

.form-help {
  font-size: 0.75rem;
  color: var(--gris-clair);
  margin-top: 4px;
}

/* Zone upload photo */
.zone-photo {
  border: 2px dashed #E0E0D8;
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--fond);
}

.zone-photo:hover { border-color: var(--orange); }
.zone-photo.requis-photo { border-color: var(--rouge); background: rgba(239,68,68,0.04); }

.zone-photo p { font-size: 0.85rem; color: var(--gris-clair); margin-top: 8px; }
.zone-photo .icone-upload { font-size: 2rem; }

.photo-preview {
  width: 100%; max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  display: none;
}

/* Badges statut */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-en-cours { background: rgba(59,130,246,0.12); color: var(--bleu); }
.badge-livree { background: rgba(234,179,8,0.12); color: var(--jaune); }
.badge-payee { background: rgba(34,197,94,0.12); color: var(--vert); }
.badge-verrouillee { background: rgba(142,142,147,0.12); color: var(--gris-clair); }

.badge-carburant { background: rgba(249,115,22,0.12); color: var(--orange); }
.badge-reparation { background: rgba(239,68,68,0.12); color: var(--rouge); }
.badge-peage { background: rgba(59,130,246,0.12); color: var(--bleu); }
.badge-repas { background: rgba(34,197,94,0.12); color: var(--vert); }
.badge-autre { background: rgba(142,142,147,0.12); color: var(--gris-clair); }

/* Item liste */
.item-liste {
  background: var(--blanc);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: all 0.2s;
}

.item-liste:hover { transform: translateY(-1px); box-shadow: var(--shadow-lg); }

.item-titre { font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
.item-sous { font-size: 0.8rem; color: var(--gris-clair); }
.item-montant { font-family: var(--font-titre); font-weight: 900; font-size: 1.1rem; }
.item-montant.vert { color: var(--vert); }
.item-montant.rouge { color: var(--rouge); }

/* Alerte */
.alerte {
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.alerte-warning { background: rgba(234,179,8,0.12); border-left: 3px solid var(--jaune); color: #92400E; }
.alerte-danger { background: rgba(239,68,68,0.08); border-left: 3px solid var(--rouge); color: #991B1B; }
.alerte-info { background: rgba(59,130,246,0.08); border-left: 3px solid var(--bleu); color: #1E40AF; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  z-index: 500;
  backdrop-filter: blur(4px);
}

.modal-overlay.centree { align-items: center; padding: 20px; }

.modal {
  background: var(--blanc);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: 28px 20px 40px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-centree {
  background: var(--blanc);
  border-radius: var(--radius-lg);
  padding: 28px 24px;
  width: 100%;
  max-width: 420px;
  animation: fadeIn 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-titre {
  font-family: var(--font-titre);
  font-size: 1.2rem;
  font-weight: 900;
  margin-bottom: 20px;
}

.modal-fermer {
  position: absolute;
  top: 16px; right: 16px;
  background: var(--fond);
  border: none;
  width: 32px; height: 32px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Séparateur */
.separateur {
  height: 1px;
  background: #E0E0D8;
  margin: 16px 0;
}

/* Chips sélection statut */
.chips-statut {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.chip {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1.5px solid #E0E0D8;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--blanc);
}

.chip.actif { border-color: var(--orange); background: var(--orange); color: var(--blanc); }

/* Verrouillage visuel */
.verrou-banner {
  background: rgba(142,142,147,0.1);
  border: 1px solid #E0E0D8;
  border-radius: var(--radius);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--gris-clair);
  margin-bottom: 16px;
}

/* Toast notification */
.toast-container {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  background: var(--noir);
  color: var(--blanc);
  padding: 12px 20px;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  animation: toastIn 0.3s ease;
  white-space: nowrap;
}

.toast.success { background: var(--vert); }
.toast.error { background: var(--rouge); }
.toast.warning { background: var(--jaune); color: var(--noir); }

@keyframes toastIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Loader */
.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px; height: 32px;
  border: 3px solid #E0E0D8;
  border-top-color: var(--orange);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Section titre avec bouton */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-titre {
  font-family: var(--font-titre);
  font-size: 1.1rem;
  font-weight: 700;
}

/* Tableau admin */
.tableau-wrapper {
  overflow-x: auto;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--blanc);
  font-size: 0.85rem;
}

th {
  background: var(--gris-fonce);
  color: var(--blanc);
  padding: 12px 14px;
  text-align: left;
  font-family: var(--font-titre);
  font-weight: 600;
}

td {
  padding: 12px 14px;
  border-bottom: 1px solid #F0F0EC;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--fond); }

/* Camion card */
.camion-card {
  background: var(--blanc);
  border-radius: var(--radius-lg);
  padding: 18px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
  border-left: 4px solid var(--orange);
}

.camion-immat {
  font-family: var(--font-titre);
  font-size: 1.1rem;
  font-weight: 900;
}

.camion-info { font-size: 0.85rem; color: var(--gris-clair); margin-top: 2px; }

.camion-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #F0F0EC;
}

.camion-stat-item { text-align: center; }
.camion-stat-label { font-size: 0.65rem; color: var(--gris-clair); text-transform: uppercase; }
.camion-stat-val {
  font-family: var(--font-titre);
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 2px;
}

/* Badge demande modification */
.badge-demande {
  display: inline-block;
  background: var(--orange);
  color: var(--blanc);
  border-radius: 50%;
  width: 18px; height: 18px;
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  line-height: 18px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--gris-clair);
}

.empty-state .icone { font-size: 3rem; margin-bottom: 12px; }
.empty-state p { font-size: 0.9rem; }

/* Filtre periode */
.filtre-periode {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filtre-btn {
  padding: 7px 14px;
  border-radius: 20px;
  border: 1.5px solid #E0E0D8;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--blanc);
  color: var(--gris-clair);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.filtre-btn.actif {
  background: var(--noir);
  border-color: var(--noir);
  color: var(--blanc);
}

/* Responsive */
@media (min-width: 600px) {
  .contenu { padding: 24px 24px 100px; }
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}
