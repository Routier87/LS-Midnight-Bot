// commands/reglement.js - COMMANDE COMPLÈTE AVEC RÔLE ET LOGS

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// IDs spécifiques pour LS Midnight RP
const REGLEMENT_ROLE_ID = '1463996203241836579'; // Rôle à donner après lecture
const REGLEMENT_LOG_CHANNEL_ID = '1463996209172578543'; // Salon des logs règlement

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reglement')
        .setDescription('📜 Poste le règlement RP complet dans le salon')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Salon où poster le règlement')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Permission refusée')
                .setDescription('Vous devez être administrateur pour utiliser cette commande.')
                .setTimestamp();
            
            return interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });
        
        const channel = interaction.options.getChannel('salon') || interaction.channel;
        
        // Créer l'embed principal
        const mainEmbed = new EmbedBuilder()
            .setColor(0x0a0a2a)
            .setTitle('📜 RÈGLEMENT RP - LS MIDNIGHT RP')
            .setDescription('**Bienvenue sur LS Midnight RP !**\n\nPour participer au serveur, vous **DEVEZ** lire et accepter le règlement ci-dessous.\n\nUtilisez les flèches pour naviguer entre les différentes sections.')
            .addFields(
                { 
                    name: '📌 Important', 
                    value: 'Le non-respect du règlement entraîne des sanctions pouvant aller jusqu\'au bannissement permanent.', 
                    inline: false 
                },
                { 
                    name: '📖 Comment naviguer', 
                    value: '• ◀️ ▶️ Flèches : Naviguer entre les pages\n• 📋 Menu : Retourner au sommaire\n• ✅ Bouton vert : Valider la lecture', 
                    inline: false 
                },
                { 
                    name: '⚠️ Attention', 
                    value: 'Vous devez lire **TOUTES** les pages avant de valider !', 
                    inline: false 
                }
            )
            .setFooter({ 
                text: `LS Midnight RP • ${new Date().toLocaleDateString('fr-FR')}`,
                iconURL: 'attachment://logo.png'
            })
            .setTimestamp();

        // Créer le premier embed de section
        const section1Embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('📘 SECTION 1 : RÈGLEMENT GÉNÉRAL')
            .setDescription('*Les règles fondamentales du serveur*')
            .addFields(
                { 
                    name: '📋 Discord', 
                    value: '```diff\n+ Obligatoire : Nom & prénom RP\n- Interdit : Pseudonymes\n```', 
                    inline: false 
                },
                { 
                    name: '🎮 Présence InGame', 
                    value: '```fix\nQuand vous jouez, vous DEVEZ être dans #InGame\n```', 
                    inline: false 
                },
                { 
                    name: '🚫 Triche & Avantages', 
                    value: '```diff\n- No-props, no-fog, no-night, crosshair custom\n- Résolutions étirées (4/3, 16/10...)\n→ Bannissement permanent immédiat\n```', 
                    inline: false 
                },
                { 
                    name: '🎨 Graphismes autorisés', 
                    value: '```md\n# Packs autorisés :\n• NVE\n• Redux\n• LA Roads uniquement\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 1/10 • Utilisez les flèches pour naviguer' });

        // Boutons de navigation
        const navigationRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('reg_prev')
                    .setLabel('◀️ Précédent')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('reg_next')
                    .setLabel('Suivant ▶️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('reg_menu')
                    .setLabel('📋 Sommaire')
                    .setStyle(ButtonStyle.Success)
            );

        // Bouton de confirmation
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('reg_accept')
                    .setLabel('✅ J\'ai lu et j\'accepte le règlement')
                    .setStyle(ButtonStyle.Success)
            );

        // Envoyer le règlement
        try {
            // Préparer les fichiers
            const files = [];
            
            // Logo
            const logoPath = path.join(__dirname, '../logo.png');
            if (fs.existsSync(logoPath)) {
                files.push(new AttachmentBuilder(logoPath, { name: 'logo.png' }));
            } else {
                console.log('⚠️ Logo non trouvé : logo.png');
            }
            
            // Background (optionnel)
            const backgroundPath = path.join(__dirname, '../background.png');
            if (fs.existsSync(backgroundPath)) {
                files.push(new AttachmentBuilder(backgroundPath, { name: 'background.png' }));
                mainEmbed.setImage('attachment://background.png');
            }
            
            // Envoyer le message
            const reglementMessage = await channel.send({
                content: '@everyone **📢 NOUVEAU RÈGLEMENT !** Veuillez le lire attentivement et cliquer sur le bouton de confirmation pour avoir accès au serveur.',
                embeds: [mainEmbed, section1Embed],
                components: [navigationRow, confirmRow],
                files: files.length > 0 ? files : undefined
            });

            // Sauvegarder les informations du règlement
            this.saveReglementInfo(reglementMessage.id, channel.id);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Règlement posté avec succès')
                .setDescription(`Le règlement a été posté dans ${channel}`)
                .addFields(
                    { name: '📝 Message ID', value: `\`${reglementMessage.id}\``, inline: true },
                    { name: '📊 Sections', value: '10 pages', inline: true },
                    { name: '👤 Rôle attribué', value: `<@&${REGLEMENT_ROLE_ID}>`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Logger l'action
            this.logReglementPost(interaction, channel, reglementMessage.id);

        } catch (error) {
            console.error('❌ Erreur reglement:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Erreur')
                .setDescription('Impossible de poster le règlement.')
                .addFields(
                    { name: 'Erreur', value: `\`\`\`${error.message}\`\`\`` }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    // Fonction pour sauvegarder les infos du règlement
    saveReglementInfo(messageId, channelId) {
        const dataPath = path.join(__dirname, '../reglement_data.json');
        const data = {
            messageId: messageId,
            channelId: channelId,
            postedAt: new Date().toISOString(),
            postedBy: 'System',
            acceptedBy: []
        };
        
        try {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            console.log('✅ Données règlement sauvegardées');
        } catch (error) {
            console.error('❌ Erreur sauvegarde règlement:', error);
        }
    },

    // Fonction pour logger le post du règlement
    logReglementPost(interaction, channel, messageId) {
        const logChannel = interaction.guild.channels.cache.get(REGLEMENT_LOG_CHANNEL_ID);
        if (!logChannel) {
            console.log(`❌ Salon logs règlement introuvable: ${REGLEMENT_LOG_CHANNEL_ID}`);
            return;
        }

        const logEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📜 RÈGLEMENT POSTÉ')
            .setDescription('Un nouveau règlement a été posté sur le serveur')
            .addFields(
                { name: '👤 Administrateur', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                { name: '📌 Salon', value: `${channel} (\`${channel.id}\`)`, inline: true },
                { name: '🆔 Message ID', value: `\`${messageId}\``, inline: true },
                { name: '🎯 Rôle attribué', value: `<@&${REGLEMENT_ROLE_ID}>`, inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(error => {
            console.error('❌ Erreur envoi log:', error);
        });
    }
};

// ==============================================================================
// FONCTIONS D'INTERACTION (À APPELER DEPUIS INDEX.JS)
// ==============================================================================

module.exports.handleButtonInteraction = async function(interaction) {
    const buttonId = interaction.customId;
    
    switch (buttonId) {
        case 'reg_accept':
            await handleReglementAccept(interaction);
            break;
            
        case 'reg_next':
        case 'reg_prev':
        case 'reg_menu':
            await handleReglementNavigation(interaction, buttonId);
            break;
    }
};

// Fonction pour gérer l'acceptation du règlement
async function handleReglementAccept(interaction) {
    const member = interaction.member;
    const dataPath = path.join(__dirname, '../reglement_data.json');
    
    // Charger les données du règlement
    let reglementData = {};
    if (fs.existsSync(dataPath)) {
        try {
            reglementData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (error) {
            console.error('❌ Erreur lecture règlement data:', error);
        }
    }
    
    // Vérifier si l'utilisateur a déjà accepté
    if (!reglementData.acceptedBy) reglementData.acceptedBy = [];
    
    if (reglementData.acceptedBy.includes(member.id)) {
        const alreadyAcceptedEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('⚠️ Déjà accepté')
            .setDescription('Vous avez déjà accepté le règlement.')
            .addFields(
                { name: '📅 Première acceptation', value: 'Date non disponible', inline: true }
            )
            .setTimestamp();
        
        return interaction.reply({ 
            embeds: [alreadyAcceptedEmbed], 
            ephemeral: true 
        });
    }
    
    // Ajouter l'utilisateur à la liste des acceptations
    reglementData.acceptedBy.push({
        id: member.id,
        tag: member.user.tag,
        date: new Date().toISOString()
    });
    
    try {
        fs.writeFileSync(dataPath, JSON.stringify(reglementData, null, 2));
    } catch (error) {
        console.error('❌ Erreur sauvegarde acceptation:', error);
    }
    
    // Donner le rôle "Règlement Lu"
    try {
        const reglementRole = interaction.guild.roles.cache.get(REGLEMENT_ROLE_ID);
        if (!reglementRole) {
            console.error(`❌ Rôle introuvable: ${REGLEMENT_ROLE_ID}`);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Erreur rôle')
                .setDescription('Le rôle règlement est introuvable. Contactez un administrateur.')
                .setTimestamp();
            
            return interaction.reply({ 
                embeds: [errorEmbed], 
                ephemeral: true 
            });
        }
        
        await member.roles.add(reglementRole);
        console.log(`✅ Rôle attribué à ${member.user.tag}`);
        
    } catch (error) {
        console.error('❌ Erreur ajout rôle règlement:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Erreur attribution rôle')
            .setDescription('Impossible d\'attribuer le rôle. Contactez un administrateur.')
            .addFields({ name: 'Erreur', value: error.message })
            .setTimestamp();
        
        return interaction.reply({ 
            embeds: [errorEmbed], 
            ephemeral: true 
        });
    }
    
    // Logger l'acceptation
    await logReglementAccept(interaction, member);
    
    // Répondre à l'utilisateur
    const confirmEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Règlement accepté avec succès !')
        .setDescription(`**Merci ${member.user.username} !**\n\nVous avez accepté le règlement et le rôle <@&${REGLEMENT_ROLE_ID}> vous a été attribué.`)
        .addFields(
            { name: '👤 Votre compte', value: `<@${member.id}>`, inline: true },
            { name: '📅 Date d\'acceptation', value: new Date().toLocaleString('fr-FR'), inline: true },
            { name: '🎮 Bon jeu', value: 'Bienvenue sur **LS Midnight RP** !', inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
    
    await interaction.reply({ 
        embeds: [confirmEmbed], 
        ephemeral: true 
    });
    
    // Mettre à jour le bouton pour cet utilisateur (optionnel)
    try {
        const newRow = ActionRowBuilder.from(interaction.message.components[1]);
        newRow.components[0].setDisabled(true);
        newRow.components[0].setLabel('✅ Règlement accepté');
        
        await interaction.message.edit({ 
            components: [interaction.message.components[0], newRow] 
        });
    } catch (error) {
        console.error('⚠️ Erreur mise à jour bouton:', error);
    }
}

// Fonction pour logger l'acceptation
async function logReglementAccept(interaction, member) {
    const logChannel = interaction.guild.channels.cache.get(REGLEMENT_LOG_CHANNEL_ID);
    if (!logChannel) {
        console.log(`❌ Salon logs règlement introuvable: ${REGLEMENT_LOG_CHANNEL_ID}`);
        return;
    }

    const logEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ RÈGLEMENT ACCEPTÉ')
        .setDescription('Un membre a accepté le règlement')
        .addFields(
            { name: '👤 Membre', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
            { name: '📅 Date', value: new Date().toLocaleString('fr-FR'), inline: true },
            { name: '🎯 Rôle attribué', value: `<@&${REGLEMENT_ROLE_ID}>`, inline: true },
            { name: '🆔 Message ID', value: `\`${interaction.message.id}\``, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 Log enregistré pour ${member.user.tag}`);
    } catch (error) {
        console.error('❌ Erreur log acceptation:', error);
    }
}

// Fonction pour gérer la navigation
async function handleReglementNavigation(interaction, buttonId) {
    const currentPage = parseInt(interaction.message.embeds[1].title?.match(/SECTION (\d+)/)?.[1]) || 1;
    let newPage = currentPage;
    
    if (buttonId === 'reg_next' && currentPage < 10) newPage = currentPage + 1;
    if (buttonId === 'reg_prev' && currentPage > 1) newPage = currentPage - 1;
    if (buttonId === 'reg_menu') newPage = 1;
    
    const embed = getReglementSection(newPage);
    
    // Mettre à jour les boutons
    const navigationRow = ActionRowBuilder.from(interaction.message.components[0]);
    navigationRow.components[0].setDisabled(newPage === 1);
    navigationRow.components[1].setDisabled(newPage === 10);
    
    await interaction.update({ 
        embeds: [interaction.message.embeds[0], embed],
        components: [navigationRow, interaction.message.components[1]] 
    });
}

// Toutes les sections du règlement
function getReglementSection(page) {
    const sections = [
        // Page 1 - Règlement Général
        new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('📘 SECTION 1 : RÈGLEMENT GÉNÉRAL')
            .setDescription('*Les règles fondamentales du serveur*')
            .addFields(
                { 
                    name: '📋 Discord', 
                    value: '```diff\n+ Obligatoire : Nom & prénom RP\n- Interdit : Pseudonymes\n```', 
                    inline: false 
                },
                { 
                    name: '🎮 Présence InGame', 
                    value: '```fix\nQuand vous jouez, vous DEVEZ être dans #InGame\n```', 
                    inline: false 
                },
                { 
                    name: '🚫 Triche & Avantages', 
                    value: '```diff\n- No-props, no-fog, no-night, crosshair custom\n- Résolutions étirées (4/3, 16/10...)\n→ Bannissement permanent immédiat\n```', 
                    inline: false 
                },
                { 
                    name: '🎨 Graphismes autorisés', 
                    value: '```md\n# Packs autorisés :\n• NVE\n• Redux\n• LA Roads uniquement\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 1/10 • Utilisez les flèches pour naviguer' }),

        // Page 2 - Lexique RP
        new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('📚 SECTION 2 : LEXIQUE RP')
            .setDescription('*Définitions des termes RP importants*')
            .addFields(
                { 
                    name: '🛡️ Zone Safe', 
                    value: '```md\n# Zone sans crime/kill (sauf dossier)\n→ Hôpitaux, Mairie, Police...\n```', 
                    inline: false 
                },
                { 
                    name: '⚡ Comportements interdits', 
                    value: '```diff\n- No Pain : Ignorer douleur\n- No Fear : Pas peur irréaliste\n- Carkill : Tuer avec véhicule\n- Force RP : Forcer action\n- Revenge Kill : Retour après mort\n```', 
                    inline: false 
                },
                { 
                    name: '⚠️ Infractions graves', 
                    value: '```diff\n- Freekill : Tuer sans raison\n- Power Gaming : Action irréaliste\n- Meta-Gaming : Infos HRP → RP\n- Usebug : Exploiter bug\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 2/10 • Utilisez les flèches pour naviguer' }),

        // Page 3 - Wipe & Mort RP
        new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('⚰️ SECTION 3 : WIPE & MORT RP')
            .setDescription('*Règles concernant les wipes et morts RP*')
            .addFields(
                { 
                    name: '📆 Conditions Wipe', 
                    value: '```md\n• 60+ jours de personnage\n• Compte positif\n• Pas de scène en cours\n```', 
                    inline: false 
                },
                { 
                    name: '⚙️ Procédure', 
                    value: '```fix\nDélai : 0-5 jours\nTous biens supprimés\nPas de remboursement\n```', 
                    inline: false 
                },
                { 
                    name: '🚫 Interdictions', 
                    value: '```diff\n- Transfert avant wipe = BAN\n- Personnage wiped inutilisable\n- Prévenir victime = Interdit\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 3/10 • Utilisez les flèches pour naviguer' }),

        // Page 4 - Safe Zones
        new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('🛡️ SECTION 4 : SAFE ZONES')
            .setDescription('*Zones sécurisées et zones interdites*')
            .addFields(
                { 
                    name: '🏥 Zones Sûres', 
                    value: '```md\n• Hôpitaux\n• Hôtel de Ville\n• Casino\n• Pompiers\n• Police\n```', 
                    inline: true 
                },
                { 
                    name: '🚫 Zones Interdites', 
                    value: '```diff\n- Base militaire\n- Prison fédérale\n- Porte-avions\n```', 
                    inline: true 
                },
                { 
                    name: '🎉 Événements', 
                    value: '```md\nDeviennent zones sûres\nTicket requis pour illégal\n```', 
                    inline: true 
                }
            )
            .setFooter({ text: 'Page 4/10 • Utilisez les flèches pour naviguer' }),

        // Page 5 - Service Public
        new EmbedBuilder()
            .setColor(0x2980B9)
            .setTitle('🚓 SECTION 5 : SERVICE PUBLIC')
            .setDescription('*Règles pour les forces de l\'ordre*')
            .addFields(
                { 
                    name: '🚫 Illégal', 
                    value: '```diff\n- Interdit sans autorisation staff\n```', 
                    inline: false 
                },
                { 
                    name: '🔫 Équipement', 
                    value: '```diff\n- Vol équipement = BAN PERMANENT\n```', 
                    inline: false 
                },
                { 
                    name: '⚖️ Sanctions', 
                    value: '```md\nAgents jugés pour illégal :\n→ Perpétuité\n→ Mort RP\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 5/10 • Utilisez les flèches pour naviguer' }),

        // Page 6 - Entreprises
        new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🏢 SECTION 6 : ENTREPRISES')
            .setDescription('*Règles pour les entreprises*')
            .addFields(
                { 
                    name: '👔 Patrons', 
                    value: '```md\n• Responsabilités\n• Création scènes\n• Présence régulière\n```', 
                    inline: false 
                },
                { 
                    name: '💰 Paiements', 
                    value: '```diff\n- Interdit en plusieurs coupures\n```', 
                    inline: false 
                },
                { 
                    name: '📩 Démission', 
                    value: '```md\nDoit être RP obligatoirement\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 6/10 • Utilisez les flèches pour naviguer' }),

        // Page 7 - Braquages
        new EmbedBuilder()
            .setColor(0xC0392B)
            .setTitle('🏦 SECTION 7 : BRAQUAGES')
            .setDescription('*Règles spécifiques pour les braquages*')
            .addFields(
                { 
                    name: '👥 Prérequis', 
                    value: '```md\n• 2+ personnes\n• Plan préparé\n• Armes\n• Otages\n```', 
                    inline: false 
                },
                { 
                    name: '🤝 Négociation', 
                    value: '```fix\nOBLIGATOIRE\n```', 
                    inline: false 
                },
                { 
                    name: '🚫 Interdits', 
                    value: '```diff\n- Moto\n- Plongée\n- Sous-marin\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 7/10 • Utilisez les flèches pour naviguer' }),

        // Page 8 - Tirs
        new EmbedBuilder()
            .setColor(0x8E44AD)
            .setTitle('🔫 SECTION 8 : TIRS')
            .setDescription('*Règles pour les échanges de tirs*')
            .addFields(
                { 
                    name: '🗣️ Procédure', 
                    value: '```md\n1. Sommations\n2. Dialogues\n3. Aucune hauteur\n```', 
                    inline: false 
                },
                { 
                    name: '🚑 Soins', 
                    value: '```diff\n- Interdits pendant échange de tirs\n```', 
                    inline: false 
                },
                { 
                    name: '⚠️ Conséquences', 
                    value: '```md\nUsage armes = lourdes conséquences RP\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 8/10 • Utilisez les flèches pour naviguer' }),

        // Page 9 - Illégal avancé
        new EmbedBuilder()
            .setColor(0x2C3E50)
            .setTitle('💣 SECTION 9 : ILLÉGAL AVANCÉ')
            .setDescription('*Règles spécifiques pour activités illégales*')
            .addFields(
                { 
                    name: '😷 Masques', 
                    value: '```md\nDoivent couvrir TOTALEMENT le visage\n```', 
                    inline: false 
                },
                { 
                    name: '💰 Rançons', 
                    value: '```md\nMaximum : 5 000$ par otage\n```', 
                    inline: false 
                },
                { 
                    name: '💊 Drogue', 
                    value: '```md\n• Vente à pied uniquement\n• Labo détruit = 2 semaines attente\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 9/10 • Utilisez les flèches pour naviguer' }),

        // Page 10 - Règle d'Or
        new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('⭐ SECTION 10 : RÈGLE D\'OR')
            .setDescription('*Le principe fondamental du serveur*')
            .addFields(
                { 
                    name: '🎭 Philosophie', 
                    value: '```md\n# Le rôleplay est un jeu COLLECTIF\n```', 
                    inline: false 
                },
                { 
                    name: '❤️ Priorité', 
                    value: '```md\n• Plaisir des autres joueurs\n• Fair-play en toutes circonstances\n• Cohérence des scènes\n```', 
                    inline: false 
                },
                { 
                    name: '✅ Confirmation', 
                    value: '```diff\n+ N\'oubliez pas de cliquer sur\n+ "J\'ai lu et j\'accepte le règlement"\n+ pour avoir accès au serveur !\n```', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Page 10/10 • Cliquez sur le bouton vert pour confirmer' })
    ];
    
    return sections[page - 1] || sections[0];
}
