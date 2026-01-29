const { 
    ChannelType, 
    PermissionsBitField, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Gestion des boutons
        if (interaction.isButton()) {
            // Bouton règles
            if (interaction.customId === 'ticket_rules') {
                await interaction.deferReply({ ephemeral: true });
                
                const rulesEmbed = new EmbedBuilder()
                    .setTitle("📜 RÈGLES DU SYSTÈME DE TICKETS")
                    .setDescription("**Pour garantir un traitement efficace :**")
                    .addFields(
                        {
                            name: "✅ **OBLIGATIONS**",
                            value: [
                                "• Décrire clairement votre problème",
                                "• Fournir des preuves (screenshots, vidéos)",
                                "• Rester poli et respectueux",
                                "• Patienter pour une réponse"
                            ].join("\n")
                        },
                        {
                            name: "❌ **INTERDICTIONS**",
                            value: [
                                "• Ouvrir des tickets inutiles",
                                "• Être irrespectueux envers le staff",
                                "• Mentionner le staff à plusieurs reprises",
                                "• Fermer un ticket sans autorisation"
                            ].join("\n")
                        }
                    )
                    .setColor(0xf39c12)
                    .setFooter({ text: "LS Midnight RP • Règlement" })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [rulesEmbed] });
                return;
            }
            
            // Types de tickets
            const ticketTypes = [
                'ticket_fondateur',
                'ticket_remboursement', 
                'ticket_staff',
                'ticket_rp',
                'ticket_legal',
                'ticket_illegal'
            ];
            
            if (ticketTypes.includes(interaction.customId)) {
                await handleTicketCreation(interaction, client);
                return;
            }
            
            // Boutons dans les tickets
            if (interaction.customId === 'close_ticket') {
                await handleCloseTicket(interaction, client);
                return;
            }
            
            if (interaction.customId === 'claim_ticket') {
                await handleClaimTicket(interaction, client);
                return;
            }
            
            if (interaction.customId === 'add_user') {
                await interaction.deferReply({ ephemeral: true });
                await interaction.editReply({ 
                    content: 'Utilisez `/ticket add @membre` pour ajouter quelqu\'un.' 
                });
                return;
            }
        }
        
        // Gestion des commandes slash
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) return;
            
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`❌ Erreur commande ${interaction.commandName}:`, error);
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ 
                        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', 
                        ephemeral: true 
                    });
                }
            }
        }
    }
};

// FONCTIONS DE GESTION DES TICKETS

async function handleTicketCreation(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    
    const guild = interaction.guild;
    const user = interaction.user;
    
    // Configuration des types de tickets
    const ticketConfig = {
        'ticket_fondateur': {
            name: "Support Fondateur",
            emoji: "👑",
            color: 0xf1c40f,
            description: "Contact direct avec la fondation / haute direction",
            roles: [client.config.roles.admin],
            categoryName: "👑・Tickets Fondateur"
        },
        'ticket_remboursement': {
            name: "Support / Remboursement", 
            emoji: "💰",
            color: 0x2ecc71,
            description: "Remboursement pour perte d'objets/argent avec preuves",
            roles: [client.config.roles.support, client.config.roles.admin],
            categoryName: "💰・Tickets Remboursement"
        },
        'ticket_staff': {
            name: "Réclamation Staff",
            emoji: "🛡️", 
            color: 0xe74c3c,
            description: "Signalement de comportement staff incorrect",
            roles: [client.config.roles.admin, client.config.roles.staff],
            categoryName: "🛡️・Tickets Staff"
        },
        'ticket_rp': {
            name: "Problème RP (Scène)",
            emoji: "🎭",
            color: 0x9b59b6,
            description: "Problèmes HRP ou scènes RP à régler",
            roles: [client.config.roles.support, client.config.roles.admin],
            categoryName: "🎭・Tickets RP"
        },
        'ticket_legal': {
            name: "Création/Reprise Légal",
            emoji: "🏢",
            color: 0x3498db,
            description: "Création ou reprise d'entreprise légale",
            roles: [client.config.roles.support, client.config.roles.admin],
            categoryName: "🏢・Tickets Légal"
        },
        'ticket_illegal': {
            name: "Création/Reprise Illégal",
            emoji: "🔫",
            color: 0x34495e,
            description: "Devenir acteur du milieu illégal",
            roles: [client.config.roles.support, client.config.roles.admin],
            categoryName: "🔫・Tickets Illégal"
        }
    };
    
    const config = ticketConfig[interaction.customId];
    
    // Vérifier les tickets existants
    const existingCategory = guild.channels.cache.find(c => 
        c.type === ChannelType.GuildCategory && 
        c.name === config.categoryName
    );
    
    let existingTicket = null;
    if (existingCategory) {
        existingTicket = existingCategory.children.cache.find(ch => 
            ch.topic && ch.topic.includes(user.id)
        );
    }
    
    if (existingTicket) {
        return interaction.editReply({
            content: `❌ **Vous avez déjà un ticket ${config.name} ouvert !**\nRendez-vous ici : ${existingTicket}`
        });
    }
    
    // Obtenir le numéro de ticket
    const counterKey = `${guild.id}_${interaction.customId}`;
    if (!client.ticketCounters.has(counterKey)) {
        client.ticketCounters.set(counterKey, 1);
    } else {
        client.ticketCounters.set(counterKey, client.ticketCounters.get(counterKey) + 1);
    }
    
    const ticketNumber = client.ticketCounters.get(counterKey);
    const formattedNumber = ticketNumber.toString().padStart(3, '0');
    
    // Créer ou récupérer la catégorie
    let ticketCategory = existingCategory;
    if (!ticketCategory) {
        ticketCategory = await guild.channels.create({
            name: config.categoryName,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageMessages
                    ]
                }
            ]
        });
    }
    
    // Ajouter les permissions des rôles
    const roleMentions = [];
    for (const roleId of config.roles) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
            await ticketCategory.permissionOverwrites.create(role, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            roleMentions.push(role.toString());
        }
    }
    
    // Créer le canal de ticket
    const ticketName = `${config.emoji}-ticket-${formattedNumber}`;
    const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        topic: `LS Midnight RP - ${config.name} #${formattedNumber} | Créateur: ${user.id} | ${user.tag}`,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AttachFiles
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageChannels
                ]
            }
        ]
    });
    
    // Ajouter les rôles au ticket
    for (const roleId of config.roles) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
            await ticketChannel.permissionOverwrites.create(role, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }
    }
    
    // Instructions spécifiques
    function getInstructions(type) {
        const instructions = {
            'ticket_fondateur': [
                "• Présentez-vous et votre rôle",
                "• Décrivez la raison du contact direct",
                "• Fournissez toutes les informations",
                "• Attendez la réponse de la direction"
            ],
            'ticket_remboursement': [
                "• Décrivez ce que vous avez perdu",
                "• Fournissez des preuves (screenshots)",
                "• Mentionnez l'heure et le lieu",
                "• Indiquez le montant/objet exact"
            ],
            'ticket_staff': [
                "• Nommez le staff concerné",
                "• Décrivez le comportement",
                "• Fournissez des preuves",
                "• Restez objectif"
            ],
            'ticket_rp': [
                "• Décrivez la scène problématique",
                "• Mentionnez les joueurs",
                "• Expliquez pourquoi c'est HRP",
                "• Fournissez des captures"
            ],
            'ticket_legal': [
                "• Précisez le type d'entreprise",
                "• Fournissez un business plan",
                "• Indiquez votre expérience RP",
                "• Expliquez votre projet"
            ],
            'ticket_illegal': [
                "• Précisez l'activité illégale",
                "• Décrivez votre expérience",
                "• Fournissez vos motivations",
                "• Expliquez votre projet"
            ]
        };
        
        return instructions[type].map(item => `• ${item}`).join('\n');
    }
    
    // Embed de bienvenue
    const welcomeEmbed = new EmbedBuilder()
        .setTitle(`${config.emoji} TICKET ${config.name.toUpperCase()} #${formattedNumber}`)
        .setDescription(`**Bienvenue ${user} dans votre ticket !**`)
        .addFields(
            {
                name: '📋 **INSTRUCTIONS**',
                value: getInstructions(interaction.customId)
            },
            {
                name: '👥 **ÉQUIPE**',
                value: roleMentions.join(' ') || 'Staff'
            },
            {
                name: '📊 **INFOS**',
                value: `**Créateur:** ${user.tag}\n**ID:** \`${user.id}\`\n**Date:** <t:${Math.floor(Date.now()/1000)}:F>`
            }
        )
        .setColor(config.color)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
            text: `LS Midnight RP • ${config.name}`, 
            iconURL: guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();
    
    // Boutons
    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Fermer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒'),
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Prendre en charge')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👤')
        );
    
    // Envoyer le message
    await ticketChannel.send({
        content: `**🔔 NOUVEAU TICKET !**\n${user} ${roleMentions.join(' ')}\n━━━━━━━━━━━━━━━━━━━━━━━━`,
        embeds: [welcomeEmbed],
        components: [actionRow]
    });
    
    // Réponse à l'utilisateur
    await interaction.editReply({
        content: `✅ **TICKET #${formattedNumber} CRÉÉ !**\nSalon : ${ticketChannel}`
    });
    
    // Logs
    const logChannel = guild.channels.cache.get(client.config.tickets.logChannelId);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setTitle('📝 NOUVEAU TICKET')
            .setDescription(`Type: ${config.name}`)
            .addFields(
                { name: '#️⃣ Numéro', value: `#${formattedNumber}`, inline: true },
                { name: '👤 Créateur', value: user.tag, inline: true },
                { name: '🔗 Salon', value: ticketChannel.toString(), inline: true }
            )
            .setColor(config.color)
            .setTimestamp();
        
        await logChannel.send({ 
            content: roleMentions.join(' '),
            embeds: [logEmbed] 
        });
    }
    
    // Sauvegarder
    client.saveTicketCounters();
}

async function handleCloseTicket(interaction, client) {
    await interaction.deferReply();
    
    const channel = interaction.channel;
    const user = interaction.user;
    
    // Vérifier les permissions
    const supportRole = interaction.guild.roles.cache.get(client.config.tickets.supportRoleId);
    const hasPermission = (supportRole && interaction.member.roles.cache.has(supportRole.id)) ||
                         interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
    
    const isCreator = channel.topic && channel.topic.includes(user.id);
    
    if (!hasPermission && !isCreator) {
        return interaction.editReply({ 
            content: '❌ Permission refusée !' 
        });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🔒 Fermeture du ticket')
        .setDescription('Le ticket sera fermé dans 10 secondes...')
        .setColor(0xe74c3c)
        .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    setTimeout(async () => {
        await channel.delete(`Fermé par ${user.tag}`);
    }, 10000);
}

async function handleClaimTicket(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    
    const supportRole = interaction.guild.roles.cache.get(client.config.tickets.supportRoleId);
    const hasPermission = (supportRole && interaction.member.roles.cache.has(supportRole.id));
    
    if (!hasPermission) {
        return interaction.editReply({ 
            content: '❌ Seul le support peut prendre en charge.' 
        });
    }
    
    const newName = `🚨-${interaction.channel.name}`;
    await interaction.channel.setName(newName);
    
    await interaction.channel.send(`**👤 ${interaction.user} a pris en charge ce ticket !**`);
    
    await interaction.editReply({ 
        content: '✅ Ticket pris en charge !' 
    });
}
