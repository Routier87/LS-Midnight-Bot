const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Configuration des logs")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Configurer les logs")
                .addChannelOption(option =>
                    option.setName("salon")
                        .setDescription("Salon pour les logs")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("test")
                .setDescription("Tester les logs")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("channel")
                .setDescription("Voir le salon de logs actuel")
        ),

    async execute(interaction, client) {
        const { options, guild } = interaction;
        const subcommand = options.getSubcommand();
        
        if (subcommand === 'setup') {
            const channel = options.getChannel('salon');
            client.config.logs.channelId = channel.id;
            
            fs.writeFileSync('./config.json', JSON.stringify(client.config, null, 2));
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Logs configurés')
                .setDescription(`Salon de logs défini sur ${channel}`)
                .setColor(0x2ecc71)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'test') {
            const logChannel = guild.channels.cache.get(client.config.logs.channelId);
            
            if (!logChannel) {
                return interaction.reply({ 
                    content: '❌ Salon de logs non configuré.', 
                    ephemeral: true 
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🧪 Test des logs')
                .setDescription('Ceci est un message de test pour vérifier que les logs fonctionnent correctement.')
                .addFields(
                    { name: 'Serveur', value: guild.name, inline: true },
                    { name: 'Membre', value: interaction.user.tag, inline: true },
                    { name: 'Date', value: new Date().toLocaleString(), inline: true }
                )
                .setColor(0x3498db)
                .setTimestamp();
            
            await logChannel.send({ embeds: [embed] });
            await interaction.reply({ 
                content: '✅ Message de test envoyé dans les logs.', 
                ephemeral: true 
            });
        }
        
        else if (subcommand === 'channel') {
            const logChannel = guild.channels.cache.get(client.config.logs.channelId);
            
            if (!logChannel) {
                return interaction.reply({ 
                    content: '❌ Aucun salon de logs configuré.', 
                    ephemeral: true 
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Salon de logs actuel')
                .setDescription(`**Salon:** ${logChannel}\n**ID:** \`${logChannel.id}\``)
                .setColor(0x9b59b6)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
