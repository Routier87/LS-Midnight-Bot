const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

class FiveMMonitor {
    constructor(client) {
        this.client = client;
        this.serverIP = client.config.fivem.serverIP;
        this.serverPort = client.config.fivem.serverPort;
        this.checkInterval = client.config.fivem.checkInterval;
        this.lastStatus = null;
        this.isMonitoring = false;
        this.consecutiveFailures = 0;
        this.maxFailures = 3;
    }
    
    // Vérifier le statut du serveur
    async checkServerStatus() {
        try {
            const response = await axios.get(`http://${this.serverIP}:${this.serverPort}/info.json`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'LS-Midnight-Bot/1.0'
                }
            });
            
            if (response.data) {
                this.consecutiveFailures = 0;
                
                return {
                    online: true,
                    players: response.data.clients || 0,
                    maxPlayers: response.data.sv_maxclients || 32,
                    hostname: response.data.hostname || 'Hydra HaloGaming',
                    gametype: response.data.gametype || 'LS Midnight RP',
                    mapname: response.data.mapname || 'Los Santos',
                    resources: response.data.resources || [],
                    vars: response.data.vars || {},
                    server: response.data.server || 'FXServer',
                    lastUpdated: Date.now()
                };
            }
        } catch (error) {
            this.consecutiveFailures++;
            console.log(`❌ Erreur vérification FiveM (${this.consecutiveFailures}/${this.maxFailures}):`, error.message);
            
            return {
                online: false,
                error: error.message,
                consecutiveFailures: this.consecutiveFailures
            };
        }
        
        return { online: false };
    }
    
    // Démarrer la surveillance
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Surveillance FiveM déjà active');
            return;
        }
        
        if (!this.client.config.fivem.monitorEnabled) {
            console.log('⚠️ Surveillance FiveM désactivée dans config');
            return;
        }
        
        this.isMonitoring = true;
        console.log(`🔍 Surveillance FiveM activée pour ${this.serverIP}:${this.serverPort}`);
        
        // Premier check immédiat
        setTimeout(() => this.performCheck(), 3000);
        
        // Check périodique
        this.interval = setInterval(() => this.performCheck(), this.checkInterval);
        
        // Log de démarrage
        this.logStartup();
    }
    
    // Arrêter la surveillance
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        clearInterval(this.interval);
        console.log('🔍 Surveillance FiveM désactivée');
    }
    
    // Logger le démarrage
    async logStartup() {
        const logChannel = this.client.channels.cache.get(this.client.config.logs.channelId);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('🚀 **SYSTÈME DE SURVEILLANCE FIVEM ACTIVÉ**')
            .setDescription(`Surveillance du serveur **${this.serverIP}:${this.serverPort}**`)
            .addFields(
                { name: '🌐 Adresse', value: `\`${this.serverIP}:${this.serverPort}\``, inline: true },
                { name: '⏱️ Intervalle', value: `${this.checkInterval/1000}s`, inline: true },
                { name: '📊 Vérification', value: 'Toutes les minutes', inline: true }
            )
            .setColor(0x9b59b6)
            .setTimestamp()
            .setFooter({ 
                text: 'LS Midnight RP • Monitoring FiveM',
                iconURL: this.client.user.displayAvatarURL()
            });
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Erreur envoi log startup:', error);
        }
    }
    
    // Effectuer une vérification
    async performCheck() {
        if (!this.isMonitoring) return;
        
        const status = await this.checkServerStatus();
        const now = new Date();
        
        // Premier check
        if (this.lastStatus === null) {
            this.lastStatus = status;
            await this.logStatusChange(status, 'INITIAL');
            return;
        }
        
        // Vérifier les changements d'état (ONLINE/OFFLINE)
        if (this.lastStatus.online !== status.online) {
            await this.logStatusChange(status, status.online ? 'ONLINE' : 'OFFLINE');
        }
        
        // Vérifier les redémarrages (OFFLINE -> ONLINE rapidement)
        const timeDiff = now - new Date(this.lastStatus.lastUpdated || 0);
        if (!this.lastStatus.online && status.online && timeDiff < 180000) { // 3 minutes
            await this.logRestart(status);
        }
        
        // Vérifier les variations de joueurs significatives
        if (status.online && this.lastStatus.online) {
            const playerDiff = Math.abs(status.players - this.lastStatus.players);
            if (playerDiff >= 3) { // Seuil de 3 joueurs
                await this.logPlayerChange(status, this.lastStatus.players);
            }
            
            // Vérifier si le serveur est vide alors qu'il était peuplé
            if (this.lastStatus.players >= 5 && status.players === 0) {
                await this.logServerEmpty();
            }
        }
        
        this.lastStatus = status;
    }
    
    // Logger les changements de statut
    async logStatusChange(status, changeType) {
        const logChannel = this.client.channels.cache.get(this.client.config.logs.channelId);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setTimestamp();
        
        if (status.online) {
            const playerPercentage = Math.round((status.players / status.maxPlayers) * 100);
            let playerColor;
            if (playerPercentage >= 80) playerColor = '🟢';
            else if (playerPercentage >= 50) playerColor = '🟡';
            else if (playerPercentage >= 20) playerColor = '🟠';
            else playerColor = '🔴';
            
            embed.setTitle(`${playerColor} **SERVEUR FIVEM EN LIGNE**`)
                .setDescription(`**${status.hostname}** est maintenant **en ligne** !`)
                .addFields(
                    { name: '🌐 Adresse', value: `\`${this.serverIP}:${this.serverPort}\``, inline: true },
                    { name: '👥 Joueurs', value: `${status.players}/${status.maxPlayers}`, inline: true },
                    { name: '📊 Remplissage', value: `${playerPercentage}%`, inline: true },
                    { name: '🎮 Mode', value: status.gametype, inline: true },
                    { name: '📍 Carte', value: status.mapname, inline: true },
                    { name: '🛠️ Version', value: status.vars['sv_projectName'] || 'FiveM', inline: true },
                    { name: '📦 Resources', value: `\`${status.resources.length}\` chargées`, inline: false }
                )
                .setColor(0x2ecc71);
        } else {
            embed.setTitle('🔴 **SERVEUR FIVEM HORS LIGNE**')
                .setDescription(`**${this.serverIP}** est actuellement **inaccessible**.`)
                .addFields(
                    { name: '🌐 Adresse', value: `\`${this.serverIP}:${this.serverPort}\``, inline: true },
                    { name: '📊 Échecs consécutifs', value: `${status.consecutiveFailures}/${this.maxFailures}`, inline: true },
                    { name: '🕐 Dernière vérification', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
                    { name: '⚠️ Erreur', value: `\`${status.error || 'Connection timeout'}\``, inline: false }
                )
                .setColor(0xe74c3c)
                .setFooter({ 
                    text: `LS Midnight RP • ${status.consecutiveFailures >= this.maxFailures ? 'Serveur probablement down' : 'Vérification en cours...'}`,
                    iconURL: this.client.user.displayAvatarURL()
                });
        }
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Erreur envoi log statut:', error);
        }
    }
    
    // Logger les redémarrages
    async logRestart(status) {
        const logChannel = this.client.channels.cache.get(this.client.config.logs.channelId);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 **REDÉMARRAGE SERVEUR DÉTECTÉ**')
            .setDescription(`Le serveur FiveM vient de redémarrer`)
            .addFields(
                { name: '🌐 Serveur', value: status.hostname, inline: true },
                { name: '👥 Joueurs', value: `${status.players}/${status.maxPlayers}`, inline: true },
                { name: '⏱️ Temps d\'arrêt', value: '< 3 minutes', inline: true },
                { name: '📍 Statut', value: '✅ Opérationnel', inline: false }
            )
            .setColor(0xf39c12)
            .setTimestamp()
            .setFooter({ 
                text: 'LS Midnight RP • Redémarrage automatique détecté',
                iconURL: this.client.user.displayAvatarURL()
            });
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Erreur envoi log redémarrage:', error);
        }
    }
    
    // Logger les changements de joueurs
    async logPlayerChange(status, previousPlayers) {
        const logChannel = this.client.channels.cache.get(this.client.config.logs.channelId);
        if (!logChannel) return;
        
        const change = status.players - previousPlayers;
        const changeText = change > 0 ? `📈 (+${change})` : `📉 (${change})`;
        const percentage = Math.round((status.players / status.maxPlayers) * 100);
        
        const embed = new EmbedBuilder()
            .setTitle('👥 **ACTIVITÉ SERVEUR**')
            .setDescription(`Variation des joueurs sur **${status.hostname}**`)
            .addFields(
                { name: '🎮 Joueurs actuels', value: `${status.players}/${status.maxPlayers}`, inline: true },
                { name: '📊 Variation', value: changeText, inline: true },
                { name: '📈 Remplissage', value: `${percentage}%`, inline: true },
                { name: '📍 Carte', value: status.mapname, inline: false },
                { name: '⏰ Période', value: 'Dernière minute', inline: false }
            )
            .setColor(percentage >= 80 ? 0x2ecc71 : percentage >= 50 ? 0xf1c40f : 0xe67e22)
            .setTimestamp()
            .setFooter({ 
                text: 'LS Midnight RP • Activité en temps réel',
                iconURL: this.client.user.displayAvatarURL()
            });
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Erreur envoi log joueurs:', error);
        }
    }
    
    // Logger serveur vide
    async logServerEmpty() {
        const logChannel = this.client.channels.cache.get(this.client.config.logs.channelId);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('🏜️ **SERVEUR VIDE**')
            .setDescription(`Le serveur n'a plus de joueurs connectés`)
            .addFields(
                { name: '🌐 Serveur', value: this.serverIP, inline: true },
                { name: '👥 Statut', value: '0 joueurs', inline: true },
                { name: '📊 Dernier pic', value: `${this.lastStatus.players} joueurs`, inline: true },
                { name: '💡 Suggestion', value: 'Relancez une communication !', inline: false }
            )
            .setColor(0x95a5a6)
            .setTimestamp()
            .setFooter({ 
                text: 'LS Midnight RP • Surveillance activité',
                iconURL: this.client.user.displayAvatarURL()
            });
        
        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Erreur envoi log serveur vide:', error);
        }
    }
    
    // Obtenir l'embed de statut pour les commandes
    async getStatusEmbed() {
        const status = await this.checkServerStatus();
        
        if (!status.online) {
            return new EmbedBuilder()
                .setTitle('🔴 **SERVEUR HORS LIGNE**')
                .setDescription(`**${this.serverIP}** n'est pas accessible`)
                .addFields(
                    { name: '🌐 Adresse', value: `\`${this.serverIP}:${this.serverPort}\``, inline: true },
                    { name: '📊 Statut', value: '❌ Déconnecté', inline: true },
                    { name: '⏱️ Dernière vérification', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
                    { name: '⚠️ Erreur', value: `\`${status.error || 'Timeout'}\``, inline: false },
                    { name: '🔧 Solution', value: 'Vérifiez que le serveur est démarré', inline: false }
                )
                .setColor(0xe74c3c)
                .setTimestamp()
                .setFooter({ 
                    text: 'LS Midnight RP • Statut serveur',
                    iconURL: this.client.user.displayAvatarURL()
                });
        }
        
        const percentage = Math.round((status.players / status.maxPlayers) * 100);
        let statusEmoji = '🔴';
        if (percentage >= 80) statusEmoji = '🟢';
        else if (percentage >= 50) statusEmoji = '🟡';
        else if (percentage >= 20) statusEmoji = '🟠';
        
        return new EmbedBuilder()
            .setTitle(`${statusEmoji} **STATUT SERVEUR FIVEM**`)
            .setDescription(`**${status.hostname}**`)
            .addFields(
                { name: '🌐 Adresse', value: `\`${this.serverIP}:${this.serverPort}\``, inline: true },
                { name: '👥 Joueurs', value: `${status.players}/${status.maxPlayers}`, inline: true },
                { name: '📊 Remplissage', value: `${percentage}%`, inline: true },
                { name: '🎮 Mode', value: status.gametype, inline: true },
                { name: '📍 Carte', value: status.mapname, inline: true },
                { name: '🛠️ Version', value: status.vars['sv_projectName'] || 'FiveM', inline: true },
                { name: '📦 Resources', value: `\`${status.resources.length}\` chargées`, inline: false },
                { name: '🔄 Uptime', value: 'Surveillance active', inline: false }
            )
            .setColor(percentage >= 80 ? 0x2ecc71 : percentage >= 50 ? 0xf1c40f : 0xe67e22)
            .setTimestamp()
            .setFooter({ 
                text: 'LS Midnight RP • Surveillance en temps réel',
                iconURL: this.client.user.displayAvatarURL()
            })
            .setThumbnail('https://cdn.discordapp.com/attachments/1066127351674687598/1066128069017677854/fivem_logo.png');
    }
}

module.exports = FiveMMonitor;
