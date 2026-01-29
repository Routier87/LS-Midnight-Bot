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
        .setName("ticket-panel")
        .setDescription("Affiche le panel de création de tickets")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });

        const embed = new EmbedBuilder()
            .setTitle("🎫 PANEL DES TICKETS - LS MIDNIGHT RP")
            .setDescription(
`**Bienvenue dans le système de tickets professionnel de LS Midnight RP**

Choisissez le type de ticket correspondant à votre demande :

**1 - Support Fondateur :** Contact direct fondateur / haute direction.
**2 - Support / Remboursement :** Si vous avez perdu un objet / argent et que vous avez des preuves.
**3 - Réclamation / Problème Staff :** Pour signaler un comportement staff incorrect.
**4 - Problème RP (Scène) :** Pour toute scène HRP ou problème en RP.
**5 - Création / Reprise Legal :** Pour créer ou reprendre une entreprise légale.
**6 - Création / Reprise Illégal :** Pour devenir un acteur du milieu illégal.

━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Instructions :**
• Choisissez le type de ticket adapté
• Décrivez votre problème clairement
• Fournissez toutes les preuves nécessaires
• Soyez patient et respectueux`)
            .setColor(0x0a0a2a)
            .setFooter({ 
                text: "LS Midnight RP • Système de support professionnel", 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_fondateur")
                .setLabel("1 • Support Fondateur")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("👑"),
            new ButtonBuilder()
                .setCustomId("ticket_remboursement")
                .setLabel("2 • Support / Remboursement")
                .setStyle(ButtonStyle.Success)
                .setEmoji("💰"),
            new ButtonBuilder()
                .setCustomId("ticket_staff")
                .setLabel("3 • Réclamation Staff")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🛡️")
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_rp")
                .setLabel("4 • Problème RP (Scène)")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🎭"),
            new ButtonBuilder()
                .setCustomId("ticket_legal")
                .setLabel("5 • Création/Reprise Légal")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🏢"),
            new ButtonBuilder()
                .setCustomId("ticket_illegal")
                .setLabel("6 • Création/Reprise Illégal")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("🔫")
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_rules")
                .setLabel("📜 Voir les règles du support")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("📜")
        );

        try {
            await interaction.editReply({
                content: "**🎫 PANEL DES TICKETS ACTIVÉ !**",
                embeds: [embed],
                components: [row1, row2, row3]
            });
        } catch (error) {
            console.error("❌ Erreur création panel:", error);
            await interaction.editReply({
                content: "❌ Une erreur est survenue lors de la création du panel.",
                ephemeral: true
            });
        }
    }
};
