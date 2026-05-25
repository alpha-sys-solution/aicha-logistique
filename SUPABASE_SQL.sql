-- ============================================================
--  AICHA LOGISTIQUE — Script SQL Supabase complet
--  Copiez-collez ce script dans l'éditeur SQL de Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE : licences (système de licence partagé)
-- ============================================================
create table if not exists licences (
  id uuid default uuid_generate_v4() primary key,
  cle text unique not null,
  nom_entreprise text not null,
  actif boolean default true,
  date_expiration date,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE : camions
-- ============================================================
create table if not exists camions (
  id uuid default uuid_generate_v4() primary key,
  licence_cle text not null references licences(cle),
  immatriculation text not null,
  marque text,
  modele text,
  annee integer,
  statut text default 'actif' check (statut in ('actif','panne','maintenance','inactif')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE : conducteurs
-- ============================================================
create table if not exists conducteurs (
  id uuid default uuid_generate_v4() primary key,
  licence_cle text not null references licences(cle),
  nom text not null,
  prenom text not null,
  telephone text,
  pin text not null, -- code PIN à 4 chiffres pour connexion
  camion_id uuid references camions(id),
  actif boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE : courses
-- ============================================================
create table if not exists courses (
  id uuid default uuid_generate_v4() primary key,
  licence_cle text not null references licences(cle),
  camion_id uuid not null references camions(id),
  conducteur_id uuid not null references conducteurs(id),
  -- Trajet
  depart text not null,
  arrivee text not null,
  client text,
  description_marchandise text,
  -- Financier
  montant_facture numeric(15,0) default 0, -- en FG
  mode_paiement text check (mode_paiement in ('especes','virement','autre')),
  -- Statut
  statut text default 'en_cours' check (statut in ('en_cours','livree','payee')),
  locked boolean default false,
  -- Dates
  date_course date not null default current_date,
  date_livraison timestamptz,
  date_paiement timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE : depenses
-- ============================================================
create table if not exists depenses (
  id uuid default uuid_generate_v4() primary key,
  licence_cle text not null references licences(cle),
  camion_id uuid not null references camions(id),
  conducteur_id uuid references conducteurs(id),
  -- Détails
  categorie text not null check (categorie in ('carburant','reparation','peage','repas','autre')),
  montant numeric(15,0) not null, -- en FG
  description text,
  -- Photo reçu (obligatoire si montant > 500000 FG)
  photo_url text,
  photo_requise boolean generated always as (montant > 500000) stored,
  -- Statut
  locked boolean default false,
  date_depense date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLE : demandes_modification
-- ============================================================
create table if not exists demandes_modification (
  id uuid default uuid_generate_v4() primary key,
  licence_cle text not null references licences(cle),
  conducteur_id uuid not null references conducteurs(id),
  type_element text not null check (type_element in ('course','depense')),
  element_id uuid not null,
  motif text not null,
  statut text default 'en_attente' check (statut in ('en_attente','approuvee','refusee')),
  created_at timestamptz default now(),
  traitee_at timestamptz
);

-- ============================================================
-- STORAGE : bucket pour les photos de reçus
-- ============================================================
-- Créer le bucket "recus" dans Supabase Storage (Storage > New Bucket)
-- Nom : recus
-- Public : false (privé)

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table licences enable row level security;
alter table camions enable row level security;
alter table conducteurs enable row level security;
alter table courses enable row level security;
alter table depenses enable row level security;
alter table demandes_modification enable row level security;

-- Policies permissives (accès via clé de licence côté app)
create policy "Accès public licences" on licences for select using (true);
create policy "Accès public camions" on camions for all using (true);
create policy "Accès public conducteurs" on conducteurs for all using (true);
create policy "Accès public courses" on courses for all using (true);
create policy "Accès public depenses" on depenses for all using (true);
create policy "Accès public demandes" on demandes_modification for all using (true);

-- ============================================================
-- INDEX pour les performances
-- ============================================================
create index if not exists idx_camions_licence on camions(licence_cle);
create index if not exists idx_conducteurs_licence on conducteurs(licence_cle);
create index if not exists idx_courses_licence on courses(licence_cle);
create index if not exists idx_courses_camion on courses(camion_id);
create index if not exists idx_courses_conducteur on courses(conducteur_id);
create index if not exists idx_depenses_licence on depenses(licence_cle);
create index if not exists idx_depenses_camion on depenses(camion_id);
create index if not exists idx_demandes_licence on demandes_modification(licence_cle);

-- ============================================================
-- DONNÉES DE TEST (optionnel — à supprimer en production)
-- ============================================================
-- insert into licences (cle, nom_entreprise) values ('AICHA-2025-TEST', 'Aicha Logistique');
