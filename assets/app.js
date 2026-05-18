// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. et/ou ses sociétés affiliées
//
// SPDX-License-Identifier: MPL-2.0

// ==================== VARIABLES GLOBALES ====================

// Configuration et état du jeu
let configJeu = null;
let etatJeu = null;
let socket = null;

// Configuration du canvas
let canvas = null;
let ctx = null;
let idAnimation = null;

// État des touches
let touchesAppuyees = {};

// 🎯 NOUVEAU: Variables pour le menu et les scores
let scores = [];
let enMenu = true;
let enTableauScores = false;

// ==================== COULEURS ====================

const COULEUR_FOND = '#f5f5f5';
const COULEUR_PREMIER_PLAN = '#282828';
const COULEUR_TETE_SERPENT = '#FF6B6B';      // Rouge
const COULEUR_CORPS_SERPENT = '#4ECDC4';     // Turquoise
const COULEUR_NOURRITURE = '#FFE66D';        // Jaune
const COULEUR_GRILLE = '#e0e0e0';            // Gris clair
const COULEUR_GRILLE_LEGERE = '#f0f0f0';    // Gris très clair
const COULEUR_DANGER = '#FF1744';            // Rouge danger

// ==================== INITIALISATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation du jeu...');
    initialiserCanvas();
    initialiserSocketIO();
    initialiserGestionnairesEntree();
    demarrerBoucleJeu();
});

// ==================== 🎯 NOUVEAU: INITIALISATION MENU ====================

function initialiserMenu() {
    console.log('📋 Initialisation du menu...');
    const btnJouer = document.getElementById('btnJouer');
    const btnScores = document.getElementById('btnScores');
    const btnRetourScores = document.getElementById('btnRetourScores');
    const btnSauvegarder = document.getElementById('btnSauvegarder');
    const btnAnnuler = document.getElementById('btnAnnuler');
    
    if (!btnJouer) {
        console.error('❌ Bouton JOUER non trouvé!');
        return;
    }
    
    // Boutons du menu
    btnJouer.addEventListener('click', () => {
        console.log('🎮 Clic sur JOUER');
        demarrerJeu();
    });
    btnScores.addEventListener('click', () => {
        console.log('🏆 Clic sur SCORES');
        afficherScores();
    });
    btnRetourScores.addEventListener('click', () => {
        console.log('← Clic sur RETOUR');
        retournerAuMenu();
    });
    
    // Boutons de dialogue
    btnSauvegarder.addEventListener('click', () => {
        console.log('💾 Clic sur SAUVEGARDER');
        sauvegarderScore();
    });
    btnAnnuler.addEventListener('click', () => {
        console.log('✕ Clic sur ANNULER');
        annulerScore();
    });
    
    // Charger les scores au démarrage
    console.log('📋 Chargement des scores...');
    if (socket && socket.connected) {
        socket.emit('action_joueur', { action: 'charger_scores' });
    }
}

function demarrerJeu() {
    console.log('🎮 Démarrage du jeu...');
    document.getElementById('menuPrincipal').style.display = 'none';
    document.getElementById('tableauScores').style.display = 'none';
    document.getElementById('conteneurJeu').style.display = 'block';
    enMenu = false;
    enTableauScores = false;
}

function afficherScores() {
    console.log('🏆 Affichage des scores...');
    document.getElementById('menuPrincipal').style.display = 'none';
    document.getElementById('tableauScores').style.display = 'flex';
    enTableauScores = true;
    chargerAffichageScores();
}

function retournerAuMenu() {
    console.log('← Retour au menu');
    document.getElementById('menuPrincipal').style.display = 'flex';
    document.getElementById('tableauScores').style.display = 'none';
    enTableauScores = false;
}

// 🔧 NOUVEAU: Fonction pour retourner au menu depuis le jeu
function retournerAuMenuDuJeu() {
    console.log('← Retour au menu depuis le jeu');
    document.getElementById('conteneurJeu').style.display = 'none';
    document.getElementById('menuPrincipal').style.display = 'flex';
    enMenu = true;
    enTableauScores = false;
    touchesAppuyees = {};
    // Réinitialiser le jeu
    if (socket && socket.connected) {
        socket.emit('action_joueur', { action: 'redemarrer' });
    }
}

function chargerAffichageScores() {
    const corpsTableau = document.getElementById('corpsTableau');
    corpsTableau.innerHTML = '';
    
    if (scores.length === 0) {
        const ligne = document.createElement('tr');
        ligne.innerHTML = '<td colspan="5" style="text-align: center; padding: 20px;">Aucun score enregistré</td>';
        corpsTableau.appendChild(ligne);
        return;
    }
    
    scores.forEach((score, index) => {
        const ligne = document.createElement('tr');
        let badge = '';
        
        // Ajouter un badge pour les 3 premiers
        if (index === 0) {
            badge = '<span class="rang_badge or">🥇</span>';
        } else if (index === 1) {
            badge = '<span class="rang_badge argent">🥈</span>';
        } else if (index === 2) {
            badge = '<span class="rang_badge bronze">🥉</span>';
        } else {
            badge = `<span class="rang_badge">${index + 1}</span>`;
        }
        
        ligne.innerHTML = `
            <td>${badge}</td>
            <td>${score.nom}</td>
            <td>${score.score}</td>
            <td>${score.repas}</td>
            <td>${score.date}</td>
        `;
        corpsTableau.appendChild(ligne);
    });
}

// ==================== 🎯 NOUVEAU: GESTION DES SCORES ====================

function afficherDialogNom() {
    console.log('💬 Affichage du dialog nom');
    document.getElementById('dialogNom').style.display = 'flex';
    document.getElementById('scorePartie').textContent = etatJeu.score;
    document.getElementById('repasPartie').textContent = etatJeu.nombre_repas;
    document.getElementById('nomJoueur').value = '';
    document.getElementById('nomJoueur').focus();
}

function masquerDialogNom() {
    document.getElementById('dialogNom').style.display = 'none';
}

function sauvegarderScore() {
    const nomJoueur = document.getElementById('nomJoueur').value.trim();
    
    if (!nomJoueur) {
        alert('Veuillez entrer un nom!');
        return;
    }
    
    console.log(`💾 Sauvegarde du score: ${nomJoueur} - ${etatJeu.score} points`);
    
    if (socket && socket.connected) {
        socket.emit('action_joueur', {
            action: 'sauvegarder_score',
            nom_joueur: nomJoueur
        });
    }
    
    masquerDialogNom();
}

function annulerScore() {
    masquerDialogNom();
    retournerAuMenu();
}

// ==================== GESTION DU CANVAS ====================

function initialiserCanvas() {
    canvas = document.getElementById('canvasJeu');
    ctx = canvas.getContext('2d');
    
    // Désactiver le lissage pour rendu croquant
    ctx.imageSmoothingEnabled = false;
    
    // Gérer le redimensionnement
    window.addEventListener('resize', gererRedimensionnement);
    gererRedimensionnement();
}

function gererRedimensionnement() {
    // Adapter le canvas à la fenêtre tout en gardant les proportions
    const largeurMax = window.innerWidth - 40;
    const hauteurMax = window.innerHeight - 200;
    const echelle = Math.min(largeurMax / 800, hauteurMax / 400, 1);
    
    if (echelle < 1) {
        canvas.style.width = `${800 * echelle}px`;
        canvas.style.height = `${400 * echelle}px`;
    } else {
        canvas.style.width = '';
        canvas.style.height = '';
    }
}

// ==================== WEBSOCKET ====================

function initialiserSocketIO() {
    console.log('🔌 Initialisation du socket...');
    socket = io(`http://${window.location.host}`);
    
    // Événement de connexion
    socket.on('connect', () => {
        console.log('✅ Connecté au serveur de jeu');
        mettreAJourEtatConnexion(true);
        socket.emit('client_connecte', {});
        
        // 🔧 CORRECTION: Initialiser le menu APRÈS connexion
        initialiserMenu();
    });
    
    // Événement de déconnexion
    socket.on('disconnect', () => {
        console.log('❌ Déconnecté du serveur');
        mettreAJourEtatConnexion(false);
    });
    
    // Événement d'initialisation du jeu
    socket.on('init_jeu', (donnees) => {
        console.log('🎮 Initialisation du jeu reçue:', donnees);
        configJeu = donnees.config;
        etatJeu = donnees.etat;
        scores = donnees.scores || [];
        mettreAJourAffichageScore();
    });
    
    // Événement de mise à jour du jeu
    socket.on('mise_a_jour_jeu', (donnees) => {
        etatJeu = donnees;
        mettreAJourAffichageScore();
        
        // 🎯 CORRECTION: Vérifier correctement si partie finie
        if (donnees.partie_finie && !enMenu && !enTableauScores) {
            const dialogNom = document.getElementById('dialogNom');
            if (dialogNom && dialogNom.style.display === 'none') {
                afficherDialogNom();
            }
        }
    });
    
    // Événement de réinitialisation du jeu
    socket.on('jeu_reinitialise', (donnees) => {
        console.log('🔄 Jeu réinitialisé');
        etatJeu = donnees.etat;
        mettreAJourAffichageScore();
        touchesAppuyees = {};
    });
    
    // 🎯 NOUVEAU: Événement de scores chargés
    socket.on('scores_charges', (donnees) => {
        scores = donnees.scores;
        console.log('📋 Scores chargés:', scores.length, 'score(s)');
    });
    
    // 🎯 NOUVEAU: Événement de score sauvegardé
    socket.on('scores_sauvegarde', (donnees) => {
        scores = donnees.scores;
        console.log('💾 Score sauvegardé! Est TOP:', donnees.est_top);
        afficherResultatScore(donnees.est_top);
    });
    
    // Événement d'erreur
    socket.on('error', (erreur) => {
        console.error('⚠️ Erreur socket:', erreur);
        afficherErreur('Erreur de connexion: ' + erreur);
    });
}

function afficherResultatScore(estTop) {
    if (estTop) {
        alert('🎉 Excellent! Vous êtes dans le TOP 10!');
    } else {
        alert('Merci d\'avoir joué! Continuez pour entrer au TOP 10!');
    }
    setTimeout(() => {
        retournerAuMenu();
    }, 1500);
}

// ==================== GESTION DES ENTRÉES ====================

function initialiserGestionnairesEntree() {
    // Clavier
    document.addEventListener('keydown', gererAppuiTouche);
    document.addEventListener('keyup', relacherTouche);
    
    // Souris/Tactile
    const canvas = document.getElementById('canvasJeu');
    if (canvas) {
        canvas.addEventListener('click', gererClicCanvas);
    }
    
    // Empêcher les actions par défaut
    window.addEventListener('keydown', (e) => {
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.code)) {
            e.preventDefault();
        }
    });
}

function gererAppuiTouche(e) {
    touchesAppuyees[e.code] = true;
    
    // Gérer les touches spéciales
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            if (!enMenu && !enTableauScores) {
                mettreEnPause();
            }
            break;
        case 'KeyR':
            e.preventDefault();
            if (!enMenu && !enTableauScores) {
                redemarrerJeu();
            }
            break;
        case 'KeyM':  // 🔧 CORRECTION: Touche M pour menu
            e.preventDefault();
            console.log('🎮 Touche M appuyée, enMenu=', enMenu);
            if (!enMenu && !enTableauScores && etatJeu && !etatJeu.partie_finie) {
                console.log('← Retour au menu depuis le jeu');
                retournerAuMenuDuJeu();
            }
            break;
    }
}

function relacherTouche(e) {
    touchesAppuyees[e.code] = false;
}

function gererClicCanvas(e) {
    // Sur mobile, cliquer redémarre si partie finie
    if (etatJeu && etatJeu.partie_finie) {
        afficherDialogNom();
    }
}

function traiterEntrees() {
    if (!socket || !socket.connected || !etatJeu || etatJeu.partie_finie || enMenu) {
        return;
    }
    
    // Vérifier les mouvements
    let deplace = false;
    
    // Flèches directionnelles
    if (touchesAppuyees['ArrowUp'] || touchesAppuyees['ArrowDown'] || 
        touchesAppuyees['ArrowLeft'] || touchesAppuyees['ArrowRight']) {
        
        if (touchesAppuyees['ArrowUp']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: 0, y: -1 } });
            deplace = true;
        } else if (touchesAppuyees['ArrowDown']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: 0, y: 1 } });
            deplace = true;
        } else if (touchesAppuyees['ArrowLeft']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: -1, y: 0 } });
            deplace = true;
        } else if (touchesAppuyees['ArrowRight']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: 1, y: 0 } });
            deplace = true;
        }
    }
    
    // Touches ZQSD (pour claviers AZERTY)
    if (!deplace && (touchesAppuyees['KeyW'] || touchesAppuyees['KeyA'] || 
                    touchesAppuyees['KeyS'] || touchesAppuyees['KeyD'])) {
        
        if (touchesAppuyees['KeyW']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: 0, y: -1 } });
        } else if (touchesAppuyees['KeyS']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: 0, y: 1 } });
        } else if (touchesAppuyees['KeyA']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: -1, y: 0 } });
        } else if (touchesAppuyees['KeyD']) {
            socket.emit('action_joueur', { action: 'deplacement', direction: { x: 1, y: 0 } });
        }
    }
}

function mettreEnPause() {
    if (socket && socket.connected) {
        socket.emit('action_joueur', { action: 'pause' });
    }
}

function redemarrerJeu() {
    if (socket && socket.connected) {
        socket.emit('action_joueur', { action: 'redemarrer' });
    }
}

// ==================== MISE À JOUR DE L'INTERFACE ====================

function mettreAJourEtatConnexion(connecte) {
    const elementEtat = document.getElementById('etatConnexion');
    if (elementEtat) {
        elementEtat.className = `etat_connexion ${connecte ? 'connecte' : 'deconnecte'}`;
        elementEtat.textContent = connecte ? 'Connecté' : 'Déconnecté';
    }
}

function mettreAJourAffichageScore() {
    if (!etatJeu) return;
    
    const elementScore = document.getElementById('score');
    const elementMeilleurScore = document.getElementById('meilleurScore');
    
    if (elementScore) {
        elementScore.textContent = String(Math.floor(etatJeu.score)).padStart(5, '0');
    }
    
    if (elementMeilleurScore) {
        elementMeilleurScore.textContent = String(Math.floor(etatJeu.meilleur_score)).padStart(5, '0');
    }
}

function afficherErreur(message) {
    console.error('❌ ' + message);
    
    const conteneurErreur = document.getElementById('conteneurErreur');
    if (conteneurErreur) {
        conteneurErreur.textContent = message;
        conteneurErreur.style.display = 'block';
        setTimeout(() => {
            conteneurErreur.style.display = 'none';
        }, 5000);
    }
}

// ==================== RENDU ====================

function nettoyerCanvas() {
    ctx.fillStyle = COULEUR_FOND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function dessinerGrille() {
    if (!configJeu) return;
    
    ctx.strokeStyle = COULEUR_GRILLE_LEGERE;
    ctx.lineWidth = 1;
    
    // Lignes verticales
    for (let x = 0; x <= configJeu.largeur; x += configJeu.taille_cellule) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, configJeu.hauteur);
        ctx.stroke();
    }
    
    // Lignes horizontales
    for (let y = 0; y <= configJeu.hauteur; y += configJeu.taille_cellule) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(configJeu.largeur, y);
        ctx.stroke();
    }
}

function dessinerSerpent() {
    if (!etatJeu || !etatJeu.serpent || etatJeu.serpent.length === 0) return;
    
    const tailleCellule = configJeu.taille_cellule;
    
    // Dessiner les segments du corps
    for (let i = 1; i < etatJeu.serpent.length; i++) {
        const segment = etatJeu.serpent[i];
        const x = segment.x * tailleCellule;
        const y = segment.y * tailleCellule;
        
        // Couleur du corps avec effet de dégradé
        const opacite = 1 - (i / etatJeu.serpent.length) * 0.3;
        ctx.fillStyle = COULEUR_CORPS_SERPENT;
        ctx.globalAlpha = opacite;
        ctx.fillRect(x + 1, y + 1, tailleCellule - 2, tailleCellule - 2);
        ctx.globalAlpha = 1;
        
        // Bordure du corps
        ctx.strokeStyle = COULEUR_CORPS_SERPENT;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, tailleCellule - 2, tailleCellule - 2);
    }
    
    // Dessiner la tête (plus lumineuse)
    const tete = etatJeu.serpent[0];
    const xTete = tete.x * tailleCellule;
    const yTete = tete.y * tailleCellule;
    
    // Changer la couleur de la tête selon la vitesse
    let couleurTete = COULEUR_TETE_SERPENT;
    if (etatJeu.vitesse >= 18) {
        // Danger ultime: clignotement rouge-blanc
        const clignotement = Math.sin(Date.now() / 100) > 0;
        couleurTete = clignotement ? COULEUR_DANGER : '#FFFFFF';
    } else if (etatJeu.vitesse >= 15) {
        couleurTete = COULEUR_DANGER;
    } else if (etatJeu.vitesse >= 10) {
        couleurTete = '#FF9800';
    }
    
    ctx.fillStyle = couleurTete;
    ctx.fillRect(xTete + 1, yTete + 1, tailleCellule - 2, tailleCellule - 2);
    
    // Bordure de la tête
    ctx.strokeStyle = COULEUR_PREMIER_PLAN;
    ctx.lineWidth = 2;
    ctx.strokeRect(xTete + 1, yTete + 1, tailleCellule - 2, tailleCellule - 2);
    
    // Yeux
    ctx.fillStyle = COULEUR_PREMIER_PLAN;
    const tailleOeil = 2;
    ctx.fillRect(xTete + 5, yTete + 5, tailleOeil, tailleOeil);
    ctx.fillRect(xTete + tailleCellule - 7, yTete + 5, tailleOeil, tailleOeil);
}

function dessinerNourriture() {
    if (!etatJeu || !etatJeu.nourriture || !configJeu) return;
    
    const tailleCellule = configJeu.taille_cellule;
    const x = etatJeu.nourriture.x * tailleCellule;
    const y = etatJeu.nourriture.y * tailleCellule;
    
    // Animation de pulsation de la nourriture
    const temps = Date.now() / 1000;
    const echelle = 0.5 + 0.3 * Math.sin(temps * 2);
    
    ctx.fillStyle = COULEUR_NOURRITURE;
    const decalage = (tailleCellule * (1 - echelle)) / 2;
    ctx.fillRect(x + decalage + 1, y + decalage + 1, tailleCellule * echelle - 2, tailleCellule * echelle - 2);
    
    // Bordure de la nourriture
    ctx.strokeStyle = COULEUR_PREMIER_PLAN;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + decalage + 1, y + decalage + 1, tailleCellule * echelle - 2, tailleCellule * echelle - 2);
}

function dessinerPartieTerminee() {
    if (!etatJeu || !etatJeu.partie_finie) return;
    
    // Superposition semi-transparente
    ctx.fillStyle = 'rgba(245, 245, 245, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texte "PARTIE TERMINÉE"
    ctx.fillStyle = COULEUR_PREMIER_PLAN;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PARTIE TERMINÉE', canvas.width / 2, canvas.height / 2 - 50);
    
    // Affichage du score
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText(`Score: ${Math.floor(etatJeu.score)}`, canvas.width / 2, canvas.height / 2);
    
    // Meilleur score
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#008184';
    ctx.fillText(`Meilleur: ${Math.floor(etatJeu.meilleur_score)}`, canvas.width / 2, canvas.height / 2 + 40);
}

function dessinerSuppressionPause() {
    if (!etatJeu || !etatJeu.en_pause) return;
    
    // Superposition semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texte "EN PAUSE"
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EN PAUSE', canvas.width / 2, canvas.height / 2);
    
    // Message de reprise clignotant
    ctx.font = '20px Arial, sans-serif';
    const temps = Date.now() % 1000;
    if (temps < 500) {
        ctx.fillText('Appuyez sur ESPACE pour reprendre', canvas.width / 2, canvas.height / 2 + 50);
    }
}

function dessinerIndicateurVitesse() {
    if (!etatJeu) return;
    
    // Afficher la vitesse actuelle en haut à gauche
    ctx.fillStyle = COULEUR_PREMIER_PLAN;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Vitesse: ${etatJeu.vitesse.toFixed(1)} FPS`, 10, 10);
    
    // Afficher le nombre de repas
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText(`🐍 Longueur: ${etatJeu.longueur_serpent} | Repas: ${etatJeu.nombre_repas}`, 10, 32);
    
    // Barre de progression de vitesse
    const largeurBarre = 200;
    const hauteurBarre = 12;
    const progressionVitesse = etatJeu.vitesse / 20;
    
    // Fond de la barre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(10, 52, largeurBarre, hauteurBarre);
    
    // Barre de progression (couleur dynamique)
    if (etatJeu.vitesse >= 18) {
        ctx.fillStyle = '#FF1744';
    } else if (etatJeu.vitesse >= 15) {
        ctx.fillStyle = '#FF6B6B';
    } else if (etatJeu.vitesse >= 10) {
        ctx.fillStyle = '#FF9800';
    } else {
        ctx.fillStyle = '#4ECDC4';
    }
    
    ctx.fillRect(10, 52, largeurBarre * progressionVitesse, hauteurBarre);
    
    // Bordure de la barre
    ctx.strokeStyle = COULEUR_PREMIER_PLAN;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 52, largeurBarre, hauteurBarre);
    
    // Label "MAX" si vitesse maximale atteinte
    if (etatJeu.vitesse >= 20) {
        ctx.fillStyle = '#FF1744';
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillText('MAX!', largeurBarre + 20, 57);
    }
}

// ==================== BOUCLE DE RENDU ====================

function afficher() {
    traiterEntrees();
    
    nettoyerCanvas();
    dessinerGrille();
    dessinerNourriture();
    dessinerSerpent();
    dessinerIndicateurVitesse();
    
    if (etatJeu && etatJeu.en_pause) {
        dessinerSuppressionPause();
    } else if (etatJeu && etatJeu.partie_finie) {
        dessinerPartieTerminee();
    }
}

function demarrerBoucleJeu() {
    function boucle() {
        if (etatJeu && !enMenu) {
            afficher();
        }
        idAnimation = requestAnimationFrame(boucle);
    }
    boucle();
}

function arreterBoucleJeu() {
    if (idAnimation) {
        cancelAnimationFrame(idAnimation);
        idAnimation = null;
    }
}

// ==================== NETTOYAGE ====================

// Nettoyer avant de quitter
window.addEventListener('beforeunload', () => {
    arreterBoucleJeu();
    if (socket) {
        socket.disconnect();
    }
});