const nearUtils = require('../../pkg/utils/near_utils');
const userInfos = require('../../pkg/models/object/user_infos');
const config = require('../../pkg/utils/config');

const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const content = new MessageEmbed().setDescription('Click the button below to mint NFT directly').setColor('BLUE');

const button = new MessageButton().setStyle('LINK').setLabel('Mint NFT');

const action = new MessageActionRow().addComponents(button);

const data = new SlashCommandBuilder()
	.setName('mint')
	.setDescription('Replies the server info')

const execute = async interaction => {
	const { ownerId } = interaction.guild;
	const userId = interaction.user.id;
	console.log(interaction.options.getSubcommand())

	if (userId === ownerId) {
		const nonce = Date.now();
		const collectionId = "paras:nn-botfrontend-test-by-nftdev-nepbottestnet"
		const sign = await nearUtils.getSign({
			nonce: nonce,
			user_id: interaction.user.id,
			guild_id: interaction.guildId,
			collection_id: collectionId,
		});
		await userInfos.addUser({
			user_id: interaction.user.id,
			guild_id: interaction.guildId,
			nonce: nonce,
		});
		button.setURL(`${config.wallet_auth_url}/mint/?user_id=${interaction.user.id}&guild_id=${interaction.guildId}&collection_id=${collectionId}&sign=${sign}`);
		interaction.reply({
			content:'\n',
			embeds:[content],
			ephemeral:true,
			components:[action],
		});
	}
	else {
		interaction.reply({
			content:'\n',
			embeds:[new MessageEmbed().setDescription('You do not have permission to operate this command').setColor('RED')],
			ephemeral:true,
		});
	}
};

module.exports = {
	data,
	execute,
};
