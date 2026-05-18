# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. et/ou ses sociétés affiliées
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
import time
import random
import threading
import json
import os

# ==================== CONSTANTES DU JEU ====================

# Dimensions du jeu
LARGEUR_JEU = 800
HAUTEUR_JEU = 400
TAILLE_CELLULE = 20
LARGEUR_GRILLE = LARGEUR_JEU // TAILLE_CELLULE      # 40
HAUTEUR_GRILLE = HAUTEUR_JEU // TAILLE_CELLULE    # 20
IPS = 10  # Images par seconde (base)

# Position et taille initiale du serpent
LONGUEUR_INITIALE = 3
POSITION_X_DEPART = LARGEUR_GRILLE // 2
POSITION_Y_DEPART = HAUTEUR_GRILLE // 2

# 🔧 CORRECTION: Vitesse réduite au démarrage
VITESSE_BASE = 4  # Réduit de 10 à 5 (beaucoup plus lent)
VITESSE_MAX = 19  # Vitesse maximale
SEUIL_AUGMENTATION_VITESSE = 500  # Points nécessaires pour augmenter la vitesse

# 🔧 CORRECTION: Accélération moins forte par repas
ACCELERATION_PAR_REPAS = 0.25  # Réduit de 0.8 à 0.3 (3x moins fort)
VITESSE_ACCELERATION_MAX = 19  # Vitesse maximale

# Fichier de stockage des scores
FICHIER_SCORES = "scores_serpent.json"
NOMBRE_MAX_SCORES = 10  # Top 10

# ==================== GESTION DES SCORES ====================

class GestionnaireScores:
    """Gère la sauvegarde et le chargement des scores"""
    
    def __init__(self, nom_fichier):
        self.nom_fichier = nom_fichier
        self.scores = self.charger_scores()
    
    def charger_scores(self):
        """Charge les scores depuis le fichier JSON"""
        try:
            if os.path.exists(self.nom_fichier):
                with open(self.nom_fichier, 'r', encoding='utf-8') as f:
                    donnees = json.load(f)
                    print(f"✅ {len(donnees)} scores chargés depuis {self.nom_fichier}")
                    return donnees
            else:
                print(f"📝 Fichier {self.nom_fichier} créé (nouveau)")
                return []
        except Exception as e:
            print(f"⚠️ Erreur lors du chargement des scores: {e}")
            return []
    
    def sauvegarder_scores(self):
        """Sauvegarde les scores dans le fichier JSON"""
        try:
            with open(self.nom_fichier, 'w', encoding='utf-8') as f:
                json.dump(self.scores, f, ensure_ascii=False, indent=2)
            print(f"💾 Scores sauvegardés dans {self.nom_fichier}")
        except Exception as e:
            print(f"⚠️ Erreur lors de la sauvegarde des scores: {e}")
    
    def ajouter_score(self, nom_joueur, score_points, repas):
        """Ajoute un nouveau score et maintient le top 10"""
        nouveau_score = {
            'nom': nom_joueur.strip()[:20],  # Maximum 20 caractères
            'score': int(score_points),
            'repas': int(repas),
            'date': time.strftime('%d/%m/%Y %H:%M:%S')
        }
        
        self.scores.append(nouveau_score)
        # Trier par score décroissant
        self.scores.sort(key=lambda x: x['score'], reverse=True)
        # Garder seulement les top 10
        self.scores = self.scores[:NOMBRE_MAX_SCORES]
        
        self.sauvegarder_scores()
        print(f"🏆 Score ajouté: {nom_joueur} - {score_points} points")
        
        return self.est_top_score(score_points)
    
    def est_top_score(self, score_points):
        """Vérifie si le score est dans le top 10"""
        if len(self.scores) < NOMBRE_MAX_SCORES:
            return True
        return score_points > self.scores[-1]['score']
    
    def obtenir_scores(self):
        """Retourne la liste des scores formatée"""
        return self.scores

# ==================== CLASSE DE GESTION D'ÉTAT ====================

class EtatJeu:
    """Gère l'état complet du jeu"""
    def __init__(self):
        self.reinitialiser()
        self.meilleur_score = 0
        self.gestionnaire_scores = GestionnaireScores(FICHIER_SCORES)
        
    def reinitialiser(self):
        """Réinitialise le jeu à son état initial"""
        # Initialiser le serpent au centre avec 3 segments
        self.serpent = [
            {'x': POSITION_X_DEPART, 'y': POSITION_Y_DEPART},
            {'x': POSITION_X_DEPART - 1, 'y': POSITION_Y_DEPART},
            {'x': POSITION_X_DEPART - 2, 'y': POSITION_Y_DEPART}
        ]
        
        self.direction = {'x': 1, 'y': 0}  # Direction actuelle (droite)
        self.prochaine_direction = {'x': 1, 'y': 0}  # Prochaine direction
        self.nourriture = self.generer_nourriture()
        self.score = 0
        self.partie_finie = False
        self.en_pause = False
        self.vitesse = VITESSE_BASE
        self.niveau_vitesse = 0
        self.nombre_repas = 0
        
    def generer_nourriture(self):
        """Génère une nourriture à une position aléatoire (pas sur le serpent)"""
        while True:
            nourriture = {
                'x': random.randint(0, LARGEUR_GRILLE - 1),
                'y': random.randint(0, HAUTEUR_GRILLE - 1)
            }
            # S'assurer que la nourriture n'apparaît pas sur le serpent
            if not any(seg['x'] == nourriture['x'] and seg['y'] == nourriture['y'] for seg in self.serpent):
                return nourriture
    
    def mettre_a_jour(self, dt):
        """Met à jour l'état du jeu"""
        if self.partie_finie or self.en_pause:
            return
        
        # Mettre à jour la direction (empêcher le serpent de faire demi-tour)
        if (self.prochaine_direction['x'] != -self.direction['x'] or 
            self.prochaine_direction['y'] != -self.direction['y']):
            self.direction = self.prochaine_direction
        
        # Calculer la nouvelle position de la tête
        tete = self.serpent[0]
        nouvelle_tete = {
            'x': (tete['x'] + self.direction['x']) % LARGEUR_GRILLE,
            'y': (tete['y'] + self.direction['y']) % HAUTEUR_GRILLE
        }
        
        # Vérifier la collision avec le corps
        if any(seg['x'] == nouvelle_tete['x'] and seg['y'] == nouvelle_tete['y'] for seg in self.serpent):
            self.partie_finie = True
            self.meilleur_score = max(self.meilleur_score, self.score)
            return
        
        # Ajouter la nouvelle tête
        self.serpent.insert(0, nouvelle_tete)
        
        # Vérifier si la nourriture est mangée
        if nouvelle_tete['x'] == self.nourriture['x'] and nouvelle_tete['y'] == self.nourriture['y']:
            self.score += 10
            self.nourriture = self.generer_nourriture()
            
            # Accélération PERMANENTE au repas
            self.nombre_repas += 1
            acceleration = ACCELERATION_PAR_REPAS * self.nombre_repas
            self.vitesse = min(VITESSE_BASE + acceleration, VITESSE_ACCELERATION_MAX)
            
            print(f"🐍 Repas #{self.nombre_repas} - Score: {self.score} - Vitesse: {self.vitesse:.1f} FPS")
        else:
            # Supprimer la queue si aucune nourriture n'est mangée
            self.serpent.pop()
    
    def definir_direction(self, direction):
        """Définit la prochaine direction du serpent"""
        self.prochaine_direction = direction
    
    def basculer_pause(self):
        """Active/désactive la pause"""
        if not self.partie_finie:
            self.en_pause = not self.en_pause
    
    def vers_dictionnaire(self):
        """Sérialise l'état du jeu pour la transmission"""
        return {
            'serpent': self.serpent,
            'nourriture': self.nourriture,
            'score': self.score,
            'meilleur_score': self.meilleur_score,
            'partie_finie': self.partie_finie,
            'en_pause': self.en_pause,
            'vitesse': self.vitesse,
            'largeur_grille': LARGEUR_GRILLE,
            'hauteur_grille': HAUTEUR_GRILLE,
            'taille_cellule': TAILLE_CELLULE,
            'nombre_repas': self.nombre_repas,
            'longueur_serpent': len(self.serpent)
        }

# ==================== INITIALISATION ====================

# Initialiser le jeu et l'interface web
jeu = EtatJeu()
ui = WebUI()

# Variables de contrôle de la boucle principale
jeu_en_cours = True
thread_jeu = None

# 🔧 CORRECTION: Variable pour stocker l'état du jeu pour Arduino
etat_jeu_cache = None

# ==================== BRIDGE POUR ENVOYER L'ÉTAT DU JEU À LED ====================

def obtenir_etat_led():
    """Retourne l'état actuel pour l'affichage matrice LED"""
    if jeu.partie_finie:
        return "partie_finie"
    elif jeu.en_pause:
        return "en_pause"
    elif jeu.score == 0:
        return "inactif"
    else:
        return "en_jeu"

def get_game_state():
    """Retourne l'état complet du jeu en JSON pour la LED - APPELÉE PAR ARDUINO"""
    global etat_jeu_cache
    
    # 🔧 CORRECTION: Utiliser l'état en cache au lieu de recalculer
    if etat_jeu_cache is not None:
        return etat_jeu_cache
    
    # Fallback : créer l'état si cache vide
    etat = {
        'etat': obtenir_etat_led(),
        'serpent': jeu.serpent,
        'nourriture': jeu.nourriture,
        'vitesse': jeu.vitesse,
        'nombre_repas': jeu.nombre_repas,
        'score': jeu.score
    }
    return json.dumps(etat)

# ==================== BOUCLE PRINCIPALE ====================

def boucle_jeu():
    """Boucle principale du jeu"""
    global jeu_en_cours, etat_jeu_cache
    derniere_mise_a_jour = time.time()
    compteur_led = 0
    
    while jeu_en_cours:
        temps_actuel = time.time()
        dt = temps_actuel - derniere_mise_a_jour
        
        # Mettre à jour le jeu à la vitesse appropriée
        if dt >= (1.0 / jeu.vitesse):
            jeu.mettre_a_jour(dt)
            derniere_mise_a_jour = temps_actuel
        
        # 🔧 CORRECTION: Mettre à jour le cache pour Arduino à chaque itération
        etat = {
            'etat': obtenir_etat_led(),
            'serpent': jeu.serpent,
            'nourriture': jeu.nourriture,
            'vitesse': jeu.vitesse,
            'nombre_repas': jeu.nombre_repas,
            'score': jeu.score
        }
        etat_jeu_cache = json.dumps(etat)
        
        # Envoyer l'état du jeu à tous les clients connectés (web)
        ui.send_message('mise_a_jour_jeu', jeu.vers_dictionnaire())
        
        # 🔧 DEBUG: Afficher la mise à jour LED tous les 50 cycles
        compteur_led += 1
        if compteur_led >= 50:
            print(f"📡 LED Update: État={obtenir_etat_led()}, Serpent={len(jeu.serpent)}, Score={jeu.score}")
            compteur_led = 0
        
        # Dormir un peu pour éviter de saturer le CPU
        time.sleep(0.01)

# ==================== GESTIONNAIRES D'ÉVÉNEMENTS WEBSOCKET ====================

def on_action_joueur(client_id, data):
    """Traite les actions du joueur"""
    action = data.get('action')
    direction = data.get('direction')
    nom_joueur = data.get('nom_joueur', 'Joueur')
    
    if action == 'deplacement' and direction:
        jeu.definir_direction(direction)
    elif action == 'pause':
        jeu.basculer_pause()
    elif action == 'redemarrer':
        jeu.reinitialiser()
        ui.send_message('jeu_reinitialise', {'etat': jeu.vers_dictionnaire()})
    elif action == 'sauvegarder_score' and nom_joueur:
        est_top = jeu.gestionnaire_scores.ajouter_score(nom_joueur, jeu.score, jeu.nombre_repas)
        scores = jeu.gestionnaire_scores.obtenir_scores()
        ui.send_message('scores_sauvegarde', {
            'scores': scores,
            'est_top': est_top,
            'position': len(scores) if not est_top else None
        })
    elif action == 'charger_scores':
        scores = jeu.gestionnaire_scores.obtenir_scores()
        ui.send_message('scores_charges', {'scores': scores})

def on_client_connecte(client_id, data):
    """Envoie l'état initial du jeu quand un client se connecte"""
    # Charger les scores au démarrage
    scores = jeu.gestionnaire_scores.obtenir_scores()
    
    ui.send_message('init_jeu', {
        'etat': jeu.vers_dictionnaire(),
        'config': {
            'largeur': LARGEUR_JEU,
            'hauteur': HAUTEUR_JEU,
            'largeur_grille': LARGEUR_GRILLE,
            'hauteur_grille': HAUTEUR_GRILLE,
            'taille_cellule': TAILLE_CELLULE
        },
        'scores': scores
    })

# ==================== ENREGISTREMENT DES GESTIONNAIRES ====================

# Enregistrer les gestionnaires d'événements WebSocket
ui.on_message('action_joueur', on_action_joueur)
ui.on_message('client_connecte', on_client_connecte)

# 🔧 CORRECTION: Fournir la fonction d'état complet LED au sketch Arduino
Bridge.provide("get_game_state", get_game_state)

# ==================== LANCEMENT DE L'APPLICATION ====================

# Lancer l'application avec la boucle de jeu personnalisée
App.run(user_loop=boucle_jeu)