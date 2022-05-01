const config = require('./config');
const user_infos = require('../models/object/user_infos');
const logger = require('./logger');
const { verify_sign } = require('./near_utils');

exports.verifyUserId = async (args, sign) => {
	const user_info = await user_infos.findOne({ where: { user_id: args.user_id, guild_id: args.guild_id } });
	if (Date.now() - user_info.nonce > 300 * 1000) { // 5min limit
		logger.error('the user nonce is great than 5 mintes');
		return false;
	}
	const key_store = config.near_wallet.key_store;
	const account_id = config.account_id;
	const keyPair = await key_store.getKey(config.nearWallet.networkId, account_id);
	const ret = verify_sign({
		guild_id: args.guild_id,
		nonce: user_info.nonce,
		user_id: args.user_id,
	}, sign, keyPair.publicKey.toString().replace('ed25519:', ''));
	if (!ret) {
		return false;
	}
	const nonce = Date.now();
	await user_info.update({
		user_id: args.user_id,
		guild_id: args.guild_id,
		nonce: nonce,
	});
	await user_info.save();
	return nonce;
};