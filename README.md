# 🐍 Jeu Snake - Application Arduino UNO Q

Jeu Snake complet avec menu, tableau des scores persistent et synchronisation matrice LED.

## 📁 Structure du Projet

```
snake-game-arduino/
├── app.yaml
├── README.md
├── python/
│   ├── main.py
│   └── requirements.txt
├── sketch/
│   ├── sketch.ino
│   ├── snake_frames.h
│   └── sketch.yaml
└── assets/
    ├── index.html
    ├── app.js
    └── style.css
```

## 🎮 Fonctionnalités

✅ **Menu Principal** - Accès au jeu et aux scores
✅ **Tableau des Scores** - Top 10 avec badges (🥇🥈🥉)
✅ **Sauvegarde Persistante** - JSON stocké en mémoire
✅ **Accélération Progressive** - +0.8 FPS par repas
✅ **LED Matrix Synchronisée** - Affichage temps réel
✅ **Responsive Design** - Desktop et mobile

## 🕹️ Commandes

- **Flèches/ZQSD**: Déplacer
- **ESPACE**: Pause
- **R**: Redémarrer
- **M**: Retour menu

## 🎯 Gameplay

1. Démarrer depuis le menu
2. Manger la nourriture pour grandir
3. Vitesse augmente avec chaque repas
4. Fin de partie = saisie du nom
5. Score sauvegardé en JSON
6. Consulter le top 10 depuis le menu

## 💾 Stockage des Scores

Les scores sont sauvegardés dans `scores_serpent.json`:
```json
[
    {"nom": "Alice", "score": 250, "repas": 25, "date": "17/05/2026 14:30:45"},
    {"nom": "Bob", "score": 180, "repas": 18, "date": "17/05/2026 14:20:12"}
]
```

## 📊 Progression de Difficulté

| Repas | Vitesse | Couleur Tête |
|-------|---------|-------------|
| 0-3 | 10-12 FPS | 🟢 Vert |
| 4-10 | 13-18 FPS | 🟠 Orange |
| 11-18 | 19-24 FPS | 🔴 Rouge |
| 19+ | 25 FPS | ⚪ Maximum |

## 🚀 Installation

1. Copier tous les fichiers dans Arduino App Lab
2. Télécharger le sketch sur Arduino UNO Q
3. Lancer l'application
4. Accéder à `<appareil>.local:7000`

## 📝 License

SPDX-License-Identifier: MPL-2.0

---

**Version**: 2.0.0 - Complet avec Menu et Scores! 🏆
**Créé**: 2026-05-17
**Statut**: ✅ Prêt à Jouer!




