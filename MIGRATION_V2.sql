-- ============================================================
--  AICHA LOGISTIQUE — Migration v2
--  Nouveaux rôles : Gérant + Admin amélioré
--  Validations mensuelles + Clôtures annuelles
-- ============================================================

-- ── 1. TABLE GÉRANTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gerants (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  licence_cle text NOT NULL REFERENCES licences(cle),
  nom text NOT NULL,
  prenom text,
  telephone text,
  pin text NOT NULL,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gerants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accès public gérants" ON gerants FOR ALL USING (true);

-- ── 2. TABLE VALIDATIONS MENSUELLES ─────────────────────────
-- Une validation par camion par mois
CREATE TABLE IF NOT EXISTS validations_mensuelles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  licence_cle text NOT NULL REFERENCES licences(cle),
  camion_id uuid NOT NULL REFERENCES camions(id),
  annee integer NOT NULL,
  mois integer NOT NULL CHECK (mois BETWEEN 1 AND 12),
  -- Statut
  statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'demandee', 'validee')),
  -- Totaux au moment de la validation
  total_revenus numeric(15,0) DEFAULT 0,
  total_depenses numeric(15,0) DEFAULT 0,
  benefice_net numeric(15,0) DEFAULT 0,
  -- Qui a fait quoi
  demandee_par uuid REFERENCES gerants(id),
  demandee_at timestamptz,
  validee_par text, -- 'admin'
  validee_at timestamptz,
  notes_admin text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Un seul enregistrement par camion par mois
  UNIQUE(licence_cle, camion_id, annee, mois)
);

ALTER TABLE validations_mensuelles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accès public validations" ON validations_mensuelles FOR ALL USING (true);
CREATE INDEX ON validations_mensuelles(licence_cle, annee, mois);
CREATE INDEX ON validations_mensuelles(camion_id);

-- ── 3. TABLE CLÔTURES ANNUELLES ─────────────────────────────
CREATE TABLE IF NOT EXISTS clotures_annuelles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  licence_cle text NOT NULL REFERENCES licences(cle),
  annee integer NOT NULL,
  -- Totaux de l'année
  total_revenus numeric(15,0) DEFAULT 0,
  total_depenses numeric(15,0) DEFAULT 0,
  benefice_net numeric(15,0) DEFAULT 0,
  -- Clôture
  cloturee boolean DEFAULT false,
  cloturee_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(licence_cle, annee)
);

ALTER TABLE clotures_annuelles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accès public clôtures" ON clotures_annuelles FOR ALL USING (true);

-- ── 4. MODIFIER COURSES — ajouter champs validation ─────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS gerant_id uuid REFERENCES gerants(id),
  ADD COLUMN IF NOT EXISTS mois_valide boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS annee_cloturee boolean DEFAULT false;

-- ── 5. MODIFIER DÉPENSES — ajouter champs validation ────────
ALTER TABLE depenses
  ADD COLUMN IF NOT EXISTS gerant_id uuid REFERENCES gerants(id),
  ADD COLUMN IF NOT EXISTS mois_valide boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS annee_cloturee boolean DEFAULT false;

-- ── 6. CRÉER L'ANNÉE EN COURS ────────────────────────────────
-- (À adapter selon l'année réelle)
INSERT INTO clotures_annuelles (licence_cle, annee, cloturee)
SELECT cle, 2026, false FROM licences
ON CONFLICT (licence_cle, annee) DO NOTHING;

-- ── INDEX ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gerants_licence ON gerants(licence_cle);
CREATE INDEX IF NOT EXISTS idx_courses_gerant ON courses(gerant_id);
CREATE INDEX IF NOT EXISTS idx_depenses_gerant ON depenses(gerant_id);

-- ============================================================
-- RÉSULTAT ATTENDU :
-- ✅ Table gerants créée
-- ✅ Table validations_mensuelles créée
-- ✅ Table clotures_annuelles créée
-- ✅ Colonnes ajoutées dans courses et depenses
-- ✅ Année 2026 initialisée
-- ============================================================
