const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fivem")
        .setDescription("Commandes de gestion du serveur FiveM")
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription("Vérifier le statut du serveur FiveM")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("info")
                .setDescription("Informations détaillées sur le serveur")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("monitor")
                .setDescription("Gérer la surveillance automatique")
                .addStringOption(option =>
                    option.setName("action")
                        .setDescription("Action à effectuer")
                        .setRequired(true)
                        .addChoices(
                            { name: "Activer", value: "start" },
                            { name: "Désactiver", value: "stop" },
                            { name: "Statut", value: "status" }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Configurer le serveur FiveM")
                .addStringOption(option =>
                    option.setName("ip")
                        .setDescription("Adresse IP/Domaine du serveur")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName("port")
                        .setDescription("Port du serveur (défaut: 30120)")
                        .setRequired(false)
                )
        ),

    async execute(interaction, client) {
        const { options } = interaction;
        const subcommand = options.getSubcommand();
        
        await interaction.deferReply({ ephemeral: subcommand !== 'status' });
        
        if (subcommand === 'status') {
            const statusEmbed = await client.fivemMonitor.getStatusEmbed();
            
            // Boutons d'action
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("🔄 Rafraîchir")
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("refresh_status"),
                    new ButtonBuilder()
                        .setLabel("🔗 Se connecter")
                        .setStyle(ButtonStyle.Link)
                        .setURL(`fivem://connect/${client.config.fivem.serverIP}:${client.config.fivem.serverPort}`),
                    new ButtonBuilder()
                        .setLabel("📊 Historique")
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("history_stats")
                );
            
            await interaction.editReply({ 
                embeds: [statusEmbed], 
                components: [row],
                ephemeral: false
            });
        }
        
        else if (subcommand === 'info') {
            const status = await client.fivemMonitor.checkServerStatus();
            
            if (!status.online) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Serveur inaccessible')
                    .setDescription('Impossible de récupérer les informations détaillées.')
                    .setColor(0xe74c3c);
                
                return interaction.editReply({ embeds: [embed] });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('📊 **INFORMATIONS DÉTAILLÉES**')
                .setDescription(`Serveur: **${status.hostname}**`)
                .addFields(
                    { name: '👥 Population', value: `${status.players} joueurs / ${status.maxPlayers} max`, inline: true },
                    { name: '🎮 Gamemode', value: status.gametype, inline: true },
                    { name: '📍 Carte', value: status.mapname, inline: true },
                    { name: '🌐 Adresse', value: `\`${client.config.fivem.serverIP}:${client.config.fivem.serverPort}\``, inline: false },
                    { name: '🛠️ Version FXServer', value: status.server, inline: true },
                    { name: '📦 Resources', value: `\`${status.resources.length}\` actives`, inline: true }
                )
                .setColor(0x3498db)
                .setFooter({ text: 'LS Midnight RP • Informations serveur' })
                .setTimestamp();
            
            // Afficher quelques variables si disponibles
            if (status.vars && Object.keys(status.vars).length > 0) {
                const varsList = Object.entries(status.vars)
                    .slice(0, 5)
                    .map(([key, value]) => `**${key}:** ${value}`)
                    .join('\n');
                
                embed.addFields({ name: '⚙️ Variables serveur', value: varsList, inline: false });
            }
            
            await interaction.editReply({ embeds: [embed] });
        }
        
        else if (subcommand === 'monitor') {
            const action = options.getString('action');
            
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply({ 
                    content: '❌ Cette commande est réservée aux administrateurs.',
                    ephemeral: true 
                });
            }
            
            if (action === 'start') {
                client.fivemMonitor.startMonitoring();
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Surveillance activée')
                    .setDescription(`Surveillance du serveur **${client.config.fivem.serverIP}** activée`)
                    .addFields(
                        { name: '⏱️ Intervalle', value: `${client.config.fivem.checkInterval/1000} secondes`, inline: true },
                        { name: '📡 Statut', value: '🟢 Actif', inline: true }
                    )
                    .setColor(0x2ecc71)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
            else if (action === 'stop') {
                client.fivemMonitor.stopMonitoring();
                
                const embed = new EmbedBuilder()
                    .setTitle('⏸️ Surveillance désactivée')
                    .setDescription('La surveillance automatique du serveur a été désactivée')
                    .setColor(0xf39c12)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
            else if (action === 'status') {
                const isActive = client.fivemMonitor.isMonitoring;
                const lastStatus = client.fivemMonitor.lastStatus;
                
                const embed = new EmbedBuilder()
                    .setTitle('📡 **STATUT SURVEILLANCE**')
                    .setDescription(`Serveur: **${client.config.fivem.serverIP}**`)
                    .addFields(
                        { name: '🔧 Surveillance', value: isActive ? '🟢 Active' : '🔴 Inactive', inline: true },
                        { name: '⏱️ Intervalle', value: `${client.config.fivem.checkInterval/1000}s`, inline: true },
                        { name: '📊 Dernier statut', value: lastStatus ? (lastStatus.online ? '🟢 En ligne' : '🔴 Hors ligne') : 'Non vérifié', inline: true }
                    )
                    .setColor(isActive ? 0x2ecc71 : 0xe74c3c)
                    .setTimestamp();
                
                if (lastStatus && lastStatus.online) {
                    embed.addFields(
                        { name: '👥 Derniers joueurs', value: `${lastStatus.players}/${lastStatus.maxPlayers}`, inline: false }
                    );
                }
                
                await interaction.editReply({ embeds: [embed] });
            }
        }
        
        else if (subcommand === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply({ 
                    content: '❌ Cette commande est réservée aux administrateurs.',
                    ephemeral: true 
                });
            }
            
            const newIP = options.getString('ip');
            const newPort = options.getString('port');
            
            if (newIP) client.config.fivem.serverIP = newIP;
            if (newPort) client.config.fivem.serverPort = newPort;
            
            // Sauvegarder la config
            const fs = require('fs');
            fs.writeFileSync('./config.json', JSON.stringify(client.config, null, 2));
            
            // Redémarrer le monitor
            client.fivemMonitor.stopMonitoring();
            client.fivemMonitor.serverIP = client.config.fivem.serverIP;
            client.fivemMonitor.serverPort = client.config.fivem.serverPort;
            client.fivemMonitor.startMonitoring();
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration mise à jour')
                .setDescription('Les paramètres FiveM ont été mis à jour')
                .addFields(
                    { name: '🌐 Nouvelle adresse', value: `\`${client.config.fivem.serverIP}:${client.config.fivem.serverPort}\``, inline: false },
                    { name: '🔧 Surveillance', value: 'Redémarrée', inline: true }
                )
                .setColor(0x2ecc71)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
