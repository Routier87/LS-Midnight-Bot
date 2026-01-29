module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignorer les messages du bot
        if (message.author.bot) return;
        
        // Logs des messages supprimés/modifiés (si configuré)
        if (client.config.logs.enabledEvents.includes('messageDelete') || 
            client.config.logs.enabledEvents.includes('messageUpdate')) {
            
            // Vous pouvez ajouter ici un système de logs avancé
            // avec une base de données si nécessaire
        }
    }
};
