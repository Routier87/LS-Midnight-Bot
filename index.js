const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Initialisation du client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// Collections
client.commands = new Collection();
client.events = new Collection();
client.config = config;

// Système de compteurs de tickets
client.ticketCounters = new Map();

// Fonction pour sauvegarder les compteurs
client.saveTicketCounters = function() {
  try {
    const obj = Object.fromEntries(this.ticketCounters);
    fs.writeFileSync('./ticketCounters.json', JSON.stringify(obj, null, 2));
  } catch (error) {
    console.log('❌ Erreur sauvegarde compteurs:', error);
  }
};

// Fonction pour charger les compteurs
client.loadTicketCounters = function() {
  try {
    if (fs.existsSync('./ticketCounters.json')) {
      const data = JSON.parse(fs.readFileSync('./ticketCounters.json', 'utf8'));
      this.ticketCounters = new Map(Object.entries(data));
      console.log(`✅ Compteurs chargés (${this.ticketCounters.size} entrées)`);
    }
  } catch (error) {
    console.log('❌ Erreur chargement compteurs:', error);
    this.ticketCounters = new Map();
  }
};

// Chargement des commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Commande chargée: ${command.data.name}`);
  } else {
    console.log(`⚠️ Commande ${filePath} manque "data" ou "execute"`);
  }
}

// Chargement des événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  
  console.log(`✅ Événement chargé: ${event.name}`);
}

// Charger les compteurs au démarrage
client.loadTicketCounters();

// Connexion du bot
client.login(config.token).then(() => {
  console.log(`🚀 Bot connecté en tant que ${client.user.tag}`);
}).catch(error => {
  console.error('❌ Erreur de connexion:', error);
});

// Sauvegarder les compteurs toutes les 5 minutes
setInterval(() => {
  client.saveTicketCounters();
}, 300000);

// Sauvegarder à la fermeture
process.on('SIGINT', () => {
  client.saveTicketCounters();
  process.exit(0);
});

// Gestion des erreurs
process.on('unhandledRejection', error => {
  console.error('Erreur non gérée:', error);
});

process.on('uncaughtException', error => {
  console.error('Exception non attrapée:', error);
});
