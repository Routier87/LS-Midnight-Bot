const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const http = require('http');

class StatusDisplay {
    constructor(client) {
        this.client = client;
        this.serverIP = client.config.fivem?.serverIP || 'HYDRA.HALOGAMING.FR';
        this.serverPort = client.config.fivem?.serverPort || '54372';
        this.announcementChannelId = client.config.announcements?.channelId || '1463996207075430483';
        this.statusMessageId = client.config.announcements?.messageId || null;
        this.lastStatus = null;
    }
    
    // Vérifier le statut du serveur
    async checkServerStatus() {
        return new Promise((resolve) => {
            const req = http.get(`http://${this.serverIP}:${this.serverPort}/info.json`, 
                { timeout: 10000 }, 
                (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const info = JSON.parse(data);
                            resolve({
                                online: true,
                                players: info.clients || 0,
                                maxPlayers: info.sv_maxclients || 32,
                                hostname: info.hostname || 'Hydra HaloGaming',
                                gametype: info.gametype || 'LS Midnight RP',
                                mapname: info.mapname || 'Los Santos'
                            });
                        } catch {
                            resolve({ online: false });
                        }
                    });
                }
            );
            
            req.on('error', () => resolve({ online: false }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ online: false });
            });
        });
    }
    
    // Obtenir le salon d'annonces
    getAnnouncementChannel() {
        if (!this.announcementChannelId) return null;
        if (!this.client.isReady()) return null;
        
        return this.client.channels.cache.get(this.announcementChannelId);
    }
    
    // Créer ou mettre à jour le message de statut
    async updateStatusDisplay() {
        try {
            const channel = this.getAnnouncementChannel();
            if (!channel) {
                console.log('❌ Salon d\'annonces introuvable');
                return;
            }
            
            const status = await this.checkServerStatus();
            
            // Créer l'embed
            const embed = this.createStatusEmbed(status);
            
            // Créer les boutons
            const buttons = this.createStatusButtons(status);
            
            // Si nous avons déjà un message, le mettre à jour
            if (this.statusMessageId) {
                try {
                    const message = await channel.messages.fetch(this.statusMessageId);
                    await message.edit({ embeds: [embed], components: [buttons] });
                    console.log(`✅ Message de statut mis à jour: ${status.online ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
                } catch (error) {
                    // Message supprimé ou inaccessible, en créer un nouveau
                    this.statusMessageId = null;
                }
            }
            
            // Créer un nouveau message si nécessaire
            if (!this.statusMessageId) {
                const message = await channel.send({ 
                    content: '**🌙 STATUT SERVEUR LS MIDNIGHT RP 🌙**',
                    embeds: [embed], 
                    components: [buttons] 
                });
                
                this.statusMessageId = message.id;
                
                // Sauvegarder l'ID dans la config
                if (this.client.config.announcements) {
                    this.client.config.announcements.messageId = message.id;
                    require('fs').writeFileSync('./config.json', 
                        JSON.stringify(this.client.config, null, 2));
                }
                
                console.log(`✅ Nouveau message de statut créé: ${message.id}`);
            }
            
            // Envoyer une annonce si le statut a changé
            if (this.lastStatus !== null && this.lastStatus !== status.online) {
                await this.sendStatusAnnouncement(status);
            }
            
            this.lastStatus = status.online;
            
        } catch (error) {
            console.error('❌ Erreur updateStatusDisplay:', error.message);
        }
    }
    
    // Créer l'embed de statut
    createStatusEmbed(status) {
        const embed = new EmbedBuilder()
            .setTimestamp();
        
        if (status.online) {
            const playerPercentage = Math.round((status.players / status.maxPlayers) * 100);
            const playerBar = this.createPlayerBar(status.players, status.maxPlayers);
            
            embed.setTitle('🟢 **SERVEUR EN LIGNE** - LS MIDNIGHT RP')
                .setDescription(`**Le serveur est actuellement ouvert et accessible !**`)
                .addFields(
                    { name: '🌐 Adresse', value: `\`${this.serverIP}:${this.serverPort}\``, inline: true },
                    { name: '👥 Joueurs', value: `${status.players}/${status.maxPlayers}`, inline: true },
                    { name: '📊 Remplissage', value: `${playerPercentage}%`, inline: true },
                    { name: '🎮 Mode', value: status.gametype, inline: true },
                    { name: '📍 Carte', value: status.mapname, inline: true },
                    { name: '📈 Activité', value: playerBar, inline: false }
                )
                .setColor(0x2ecc71)
                .setThumbnail('https://cdn.discordapp.com/emojis/✅.png?v=1')
                .setFooter({ 
                    text: 'Dernière mise à jour',
                    iconURL: this.client.user.displayAvatarURL()
                });
        } else {
            embed.setTitle('🔴 **SERVEUR HORS LIGNE** - LS MIDNIGHT RP')
                .setDescription(`**Le serveur est actuellement indisponible.**\nNotre équipe technique a été alertée.`)
                .addFields(
                    { name: '🌐 Adresse', value: `\`${this.serverIP}:${this.serverPort}\``, inline: true },
                    { name: '📊 Statut', value: 'Maintenance/Redémarrage', inline: true },
                    { name: '🕐 Estimation', value: 'En cours de résolution', inline: true },
                    { name: '📞 Support', value: 'Créez un ticket si le problème persiste', inline: false }
                )
                .setColor(0xe74c3c)
                .setThumbnail('https://cdn.discordapp.com/emojis/❌.png?v=1')
                .setFooter({ 
                    text: 'Serveur en maintenance',
                    iconURL: this.client.user.displayAvatarURL()
                });
        }
        
        return embed;
    }
    
    // Créer une barre de progression pour les joueurs
    createPlayerBar(current, max) {
        const percentage = Math.round((current / max) * 100);
        const filledBlocks = Math.round((current / max) * 10);
        const emptyBlocks = 10 - filledBlocks;
        
        let bar = '';
        for (let i = 0; i < filledBlocks; i++) bar += '🟩';
        for (let i = 0; i < emptyBlocks; i++) bar += '⬛';
        
        return `${bar} ${percentage}%`;
    }
    
    // Créer les boutons d'action
    createStatusButtons(status) {
        const row = new ActionRowBuilder();
        
        if (status.online) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('🔗 Se Connecter')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`fivem://connect/${this.serverIP}:${this.serverPort}`),
                new ButtonBuilder()
                    .setLabel('🔄 Rafraîchir')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('refresh_status'),
                new ButtonBuilder()
                    .setLabel('📊 Statut Complet')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('full_status')
            );
        } else {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('📞 Support Technique')
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId('support_ticket'),
                new ButtonBuilder()
                    .setLabel('🔄 Vérifier')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('check_status'),
                new ButtonBuilder()
                    .setLabel('ℹ️ Informations')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('server_info')
            );
        }
        
        return row;
    }
    
    // Envoyer une annonce de changement de statut
    async sendStatusAnnouncement(status) {
        try {
            const channel = this.getAnnouncementChannel();
            if (!channel) return;
            
            if (status.online) {
                await channel.send({
                    content: `@everyone\n🎉 **LE SERVEUR EST DE RETOUR !** 🎉\n\`connect ${this.serverIP}:${this.serverPort}\``,
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ **SERVEUR EN LIGNE**')
                        .setDescription('Le serveur FiveM est maintenant accessible !')
                        .setColor(0x2ecc71)
                        .setTimestamp()
                    ]
                });
            } else {
                await channel.send({
                    content: `@here\n⚠️ **LE SERVEUR EST HORS LIGNE** ⚠️`,
                    embeds: [new EmbedBuilder()
                        .setTitle('🔴 **MAINTENANCE EN COURS**')
                        .setDescription('Le serveur FiveM est temporairement indisponible.')
                        .addFields(
                            { name: '🛠️ Raison', value: 'Maintenance technique' },
                            { name: '⏱️ Estimation', value: 'En cours de diagnostic' },
                            { name: '📞 Support', value: 'Créez un ticket si besoin' }
                        )
                        .setColor(0xe74c3c)
                        .setTimestamp()
                    ]
                });
            }
            
            console.log(`📢 Annonce envoyée: ${status.online ? 'ONLINE' : 'OFFLINE'}`);
            
        } catch (error) {
            console.error('❌ Erreur annonce:', error.message);
        }
    }
    
    // Démarrer la surveillance
    startMonitoring() {
        console.log(`📊 Surveillance annonces activée: ${this.serverIP}`);
        
        // Premier affichage
        setTimeout(() => this.updateStatusDisplay(), 5000);
        
        // Mise à jour périodique
        this.interval = setInterval(() => this.updateStatusDisplay(), 60000); // Toutes les minutes
    }
    
    // Arrêter la surveillance
    stopMonitoring() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
}

module.exports = StatusDisplay;
