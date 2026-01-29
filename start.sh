#!/bin/bash
# Fichier: start.sh

echo "🚀 Démarrage du bot LS Midnight RP..."

# Vérifier si node_modules existe, sinon installer
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install --production
else
    echo "✅ Dépendances déjà installées"
fi

# Démarrer le bot
echo "🤖 Lancement du bot..."
node index.js
