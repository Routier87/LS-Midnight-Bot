const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Gestion des tickets")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName("close")
                .setDescription("Fermer un ticket")
                .addStringOption(option =>
                    option.setName("raison")
                        .setDescription("Raison de la fermeture")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Ajouter un membre au ticket")
                .addUserOption(option =>
                    option.setName("membre")
                        .setDescription("Membre à ajouter")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Retirer un membre du ticket")
                .addUserOption(option =>
                    option.setName("membre")
                        .setDescription("Membre à retirer")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("rename")
                .setDescription("Renommer le ticket")
                .addStringOption(option =>
                    option.setName("nom")
                        .setDescription("Nouveau nom du ticket")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("stats")
                .setDescription("Voir les statistiques des tickets")
        ),

    async execute(interaction, client) {
        const { options, channel, guild, member } = interaction;
        const subcommand = options.getSubcommand();
        
        // Vérifier si c'est un ticket (sauf pour stats)
        if (subcommand !== 'stats') {
            const isTicket = channel.name.includes('ticket-') || 
                            channel.name.includes('-ticket-') ||
                            (channel.parent && channel.parent.name.includes('Tickets'));
            
            if (!isTicket) {
                return interaction.reply({ 
                    content: '❌ Cette commande ne peut être utilisée que dans un ticket.', 
                    ephemeral: true 
                });
            }
        }
        
        if (subcommand === 'close') {
            const raison = options.getString('raison') || 'Aucune raison fournie';
            
            const embed = new EmbedBuilder()
                .setTitle('🔒 Fermeture du ticket')
                .setDescription(`Le ticket sera fermé dans 5 secondes...`)
                .addFields(
                    { name: 'Raison', value: raison },
                    { name: 'Fermé par', value: member.user.tag }
                )
                .setColor(0xe74c3c)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
            setTimeout(async () => {
                await channel.delete(`Ticket fermé par ${member.user.tag} - Raison: ${raison}`);
            }, 5000);
        }
        
        else if (subcommand === 'add') {
            const user = options.getUser('membre');
            
            await channel.permissionOverwrites.create(user, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            
            await interaction.reply({ 
                content: `✅ ${user} a été ajouté au ticket.`, 
                ephemeral: true 
            });
        }
        
        else if (subcommand === 'remove') {
            const user = options.getUser('membre');
            
            await channel.permissionOverwrites.delete(user);
            
            await interaction.reply({ 
                content: `✅ ${user} a été retiré du ticket.`, 
                ephemeral: true 
            });
        }
        
        else if (subcommand === 'rename') {
            const newName = options.getString('nom');
            
            await channel.setName(newName);
            
            await interaction.reply({ 
                content: `✅ Le ticket a été renommé en \`${newName}\`.`, 
                ephemeral: true 
            });
        }
        
        else if (subcommand === 'stats') {
            const categories = guild.channels.cache.filter(c => 
                c.type === ChannelType.GuildCategory && 
                c.name.includes('Tickets')
            );
            
            let totalTickets = 0;
            let openTickets = 0;
            const statsByType = [];
            
            categories.forEach(category => {
                const ticketsInCategory = category.children.cache.size;
                openTickets += ticketsInCategory;
                statsByType.push(`${category.name}: ${ticketsInCategory} tickets`);
            });
            
            totalTickets = client.ticketCounters.size > 0 ? 
                Array.from(client.ticketCounters.values()).reduce((a, b) => a + b, 0) : 0;
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Statistiques des tickets - LS Midnight RP')
                .addFields(
                    { name: '🎫 Tickets ouverts', value: `${openTickets}`, inline: true },
                    { name: '📈 Total tickets créés', value: `${totalTickets}`, inline: true },
                    { name: '📂 Catégories actives', value: `${categories.size}`, inline: true },
                    { name: '📋 Répartition par type', value: statsByType.join('\n') || 'Aucun ticket' }
                )
                .setColor(0x3498db)
                .setFooter({ text: 'LS Midnight RP • Statistiques' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
