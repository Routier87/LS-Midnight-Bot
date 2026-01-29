const { REST, Routes } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ Connecté en tant que ${client.user.tag}`);
        console.log(`🏠 Servant ${client.guilds.cache.size} serveur(s)`);
        
        // Statut personnalisé
        client.user.setPresence({
            activities: [{
                name: 'LS Midnight RP',
                type: 3 // WATCHING
            }],
            status: 'online'
        });
        
        // Enregistrement des commandes slash
        try {
            const rest = new REST({ version: '10' }).setToken(client.config.token);
            const commands = [];
            
            const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const command = require(`../commands/${file}`);
                commands.push(command.data.toJSON());
            }
            
            await rest.put(
                Routes.applicationGuildCommands(client.config.clientId, client.config.guildId),
                { body: commands }
            );
            
            console.log(`✅ ${commands.length} commandes slash enregistrées`);
        } catch (error) {
            console.error('❌ Erreur d\'enregistrement des commandes:', error);
        }
    }
};
