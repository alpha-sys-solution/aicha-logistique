# 🚛 Aicha Logistique — PWA

Application de gestion logistique (courses, dépenses, gérants, camions) avec mode offline.

---

## 🏗️ Stack technique

- **Frontend** : HTML / CSS / JS vanilla (PWA)
- **Base de données** : [Supabase](https://supabase.com)
- **Hébergement** : [Cloudflare Pages](https://pages.cloudflare.com) (gratuit, bandwidth illimité)
- **Sécurité** : clés Supabase stockées en variables d'environnement Cloudflare (jamais dans le code)

---

## 🚀 Déploiement Cloudflare Pages

### 1. Prérequis

- Un compte [Cloudflare](https://dash.cloudflare.com) (gratuit)
- Un compte [Supabase](https://supabase.com) avec le projet configuré
- Ce repo GitHub connecté à Cloudflare Pages

### 2. Connecter le repo à Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages**
2. **Connect to Git** → sélectionner ce repo
3. Configuration du build :
   - **Framework preset** : `None`
   - **Build command** : *(laisser vide)*
   - **Build output directory** : `/` *(racine)*
4. Cliquer **Save and Deploy**

### 3. Ajouter les variables d'environnement

Dans Cloudflare Pages → ton projet → **Settings** → **Environment variables** → **Add variable** :

| Variable | Valeur | Environnement |
|---|---|---|
| `SUPABASE_URL` | `https://XXXX.supabase.co` | Production + Preview |
| `SUPABASE_KEY` | `eyJ...` (anon key) | Production + Preview |

> ⚠️ Ne jamais committer ces valeurs dans le code source.

### 4. Configurer Supabase

1. Aller sur [supabase.com](https://supabase.com) → ton projet → **SQL Editor**
2. Exécuter `SUPABASE_SQL.sql` puis `MIGRATION_V2.sql`
3. **Storage** → **New Bucket** → nom : `recus`, public : **NON**
4. **Storage** → **Policies** → ajouter une policy INSERT pour `anon` sur `recus`

### 5. Créer la première licence

**Table Editor** → table `licences` → **Insert row** :

| Champ | Valeur |
|---|---|
| `cle` | `AICHA-2025-001` |
| `nom_entreprise` | `Aicha Logistique` |
| `actif` | `true` |
| `date_expiration` | `2026-12-31` |

---

## 💻 Développement local

Cloudflare Pages Functions nécessite [Wrangler](https://developers.cloudflare.com/workers/wrangler/) pour fonctionner en local :

```bash
npm install -g wrangler

# Créer un fichier .dev.vars (équivalent local des variables d'env)
echo "SUPABASE_URL=https://XXXX.supabase.co" >> .dev.vars
echo "SUPABASE_KEY=eyJ..." >> .dev.vars

# Lancer le serveur local
wrangler pages dev . --port 8788
```

> `.dev.vars` est dans `.gitignore` — il ne sera jamais commité.

---

## 📁 Structure du projet

```
aicha-logistique/
├── index.html              # App principale (gérant)
├── admin/
│   └── index.html          # Interface admin
├── js/
│   ├── supabase.js         # Client Supabase + toutes les fonctions DB
│   ├── app.js              # Logique app gérant
│   ├── notifications.js    # Notifications push
│   └── offline-queue.js    # File d'attente offline
├── css/
│   └── app.css             # Styles
├── functions/
│   └── api/
│       └── config.js       # Cloudflare Pages Function (injecte les variables d'env)
├── icons/                  # Icônes PWA
├── manifest.json           # Manifest PWA
├── sw.js                   # Service Worker
├── _headers                # Headers HTTP Cloudflare Pages
├── .gitignore
├── .env.example            # Template variables d'environnement
├── SUPABASE_SQL.sql        # Schéma initial
└── MIGRATION_V2.sql        # Migration v2
```

---

## 🔐 Sécurité

- Les clés Supabase ne sont **jamais** dans le code source
- Elles sont injectées via `/api/config` (Cloudflare Pages Function)
- La clé utilisée est la clé **anon** (publique par design Supabase) — les règles RLS Supabase protègent les données
- Vérifier que les **Row Level Security (RLS)** sont bien activées sur toutes les tables Supabase

---

## 📱 Fonctionnalités PWA

- ✅ Installable sur mobile (Add to Home Screen)
- ✅ Mode offline (Service Worker + cache)
- ✅ File d'attente offline (actions synchronisées à la reconnexion)
- ✅ Notifications push

---

## 👥 Rôles

| Rôle | Accès |
|---|---|
| **Admin** | Tableau de bord complet, validation mensuelle, clôture annuelle, gestion gérants/camions |
| **Gérant** | Saisie courses et dépenses, demande de validation mensuelle |
