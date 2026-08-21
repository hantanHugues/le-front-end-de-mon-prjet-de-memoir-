# BioGate Dashboard — Guide de démarrage

## Installation (une seule fois)

```bash
cd biogate-dashboard
npm install
```

## Lancer en développement

**1. Démarrer le serveur BioGate (dans un terminal séparé) :**
```bash
cd Projet-de-vision-par-ordinateur-...
python -m uvicorn api:app --host 0.0.0.0 --port 8000
```

**2. Démarrer le dashboard :**
```bash
cd biogate-dashboard
npm run dev
```

## Premier couplage

1. Le dashboard affiche l'écran de connexion
2. Entrer l'adresse IP du serveur : `http://192.168.1.X:8000`
3. Cliquer **"Connecter → générer PIN"**
4. Le PIN s'affiche dans le terminal du serveur (6 chiffres)
5. Saisir le PIN dans le dashboard → accès permanent

Le token est chiffré par l'OS (Windows DPAPI) et conservé entre redémarrages.

## Build distributable

```bash
npm run dist
```
Génère un installeur NSIS dans `dist-electron/`.
