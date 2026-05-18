// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. et/ou ses sociétés affiliées
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>
#include <ArduinoJson.h>
#include "snake_frames.h"

// Initialiser la matrice LED
Arduino_LED_Matrix matrice;

// Variables de suivi
unsigned long temps_dernier_update = 0;
const unsigned long DELAI_UPDATE = 50; // millisecondes

// 🎯 Grille LED 8x13 pour afficher le snake
uint8_t grille_led[104];

// 🎯 État actuel
String etat_jeu_actuel = "inactif";

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n\n=== DÉMARRAGE ARDUINO LED SNAKE ===");
    
    // Initialiser la matrice LED
    matrice.begin();
    matrice.setGrayscaleBits(3);
    
    // Afficher l'écran d'accueil
    matrice.draw(inactif);
    Serial.println("✅ Matrice LED initialisée - Affichage écran d'accueil");
    
    // Initialiser le Bridge
    Bridge.begin();
    Serial.println("✅ Bridge Arduino initialisé");
}

void loop() {
    // 🎯 Récupérer l'état complet du jeu depuis Python
    String game_state_str;
    bool ok = Bridge.call("get_game_state").result(game_state_str);
    
    if (ok && game_state_str.length() > 50) {
        // Parser le JSON
        StaticJsonDocument<2048> doc;
        DeserializationError error = deserializeJson(doc, game_state_str);
        
        if (!error) {
            String etat = doc["etat"] | "inactif";
            
            // Mettre à jour l'affichage LED
            unsigned long temps_actuel = millis();
            
            if (etat == "en_jeu") {
                // Afficher le snake en temps réel
                if (temps_actuel - temps_dernier_update > DELAI_UPDATE) {
                    afficher_snake_sur_led(doc);
                    temps_dernier_update = temps_actuel;
                }
                
            } else if (etat == "en_pause") {
                // Afficher l'écran pause
                matrice.draw(en_pause);
                
            } else if (etat == "partie_finie") {
                // Faire scintiller
                if ((temps_actuel / 500) % 2 == 0) {
                    matrice.draw(partie_finie);
                } else {
                    uint8_t vide[104] = {0};
                    matrice.draw(vide);
                }
                
            } else {
                // Inactif ou autre
                matrice.draw(inactif);
            }
        }
    }
    
    delay(20);
}

// 🎯 Afficher le snake et la nourriture sur la LED
void afficher_snake_sur_led(JsonDocument &doc) {
    // Initialiser la grille LED (tout noir)
    memset(grille_led, 0, sizeof(grille_led));
    
    // Récupérer les données
    JsonArray serpent = doc["serpent"];
    JsonObject nourriture = doc["nourriture"];
    int vitesse = doc["vitesse"] | 5;
    
    // Dimensions
    const int LARGEUR_GRILLE = 40;
    const int HAUTEUR_GRILLE = 20;
    const int LARGEUR_LED = 13;
    const int HAUTEUR_LED = 8;
    
    // Facteurs d'échelle
    float scaleX = (float)LARGEUR_LED / LARGEUR_GRILLE;
    float scaleY = (float)HAUTEUR_LED / HAUTEUR_GRILLE;
    
    // 1️⃣ Afficher la nourriture (JAUNE - valeur 7)
    if (nourriture != nullptr) {
        int food_x = nourriture["x"];
        int food_y = nourriture["y"];
        
        int led_x = (int)(food_x * scaleX);
        int led_y = (int)(food_y * scaleY);
        
        // Vérifier les limites
        if (led_x >= 0 && led_x < LARGEUR_LED && led_y >= 0 && led_y < HAUTEUR_LED) {
            int index = led_y * LARGEUR_LED + led_x;
            if (index >= 0 && index < 104) {
                grille_led[index] = 7; // Jaune lumineux
            }
        }
    }
    
    // 2️⃣ Afficher le serpent
    if (serpent != nullptr && serpent.size() > 0) {
        for (int i = 0; i < serpent.size(); i++) {
            JsonObject segment = serpent[i];
            int seg_x = segment["x"];
            int seg_y = segment["y"];
            
            int led_x = (int)(seg_x * scaleX);
            int led_y = (int)(seg_y * scaleY);
            
            // Vérifier les limites
            if (led_x >= 0 && led_x < LARGEUR_LED && led_y >= 0 && led_y < HAUTEUR_LED) {
                int index = led_y * LARGEUR_LED + led_x;
                if (index >= 0 && index < 104) {
                    if (i == 0) {
                        // Tête : Rouge lumineux (7) ou Magenta (5) si rapide
                        grille_led[index] = (vitesse >= 12) ? 5 : 7;
                    } else {
                        // Corps : Vert moyen (3)
                        grille_led[index] = 3;
                    }
                }
            }
        }
    }
    
    // Afficher la grille sur la LED
    matrice.draw(grille_led);
}