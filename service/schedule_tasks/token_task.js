const contractUtils = require('../../pkg/utils/contract_utils');
const discordUtils = require('../../pkg/utils/discord_utils');
const nearUtils = require('../../pkg/utils/near_utils');
const logger = require('../../pkg/utils/logger');
const userInfos = require('../../pkg/models/object/user_infos');
const userFields = require('../../pkg/models/object/user_fields');
const config = require('../../pkg/utils/config');
const BN = require('bn.js');
const token_task = async function(receipts) {
  const allFieldList = await userFields.getUserFields({
    key: 'token_id',
  });
  const allTokenList = [];
  for (const field of allFieldList) {
    allTokenList.push(field.value);
  }
  const actions = await contractUtils.filterTokenActions(allTokenList, receipts);
  const accountIdList = [];
  const tokenList = [];
  for (const action of actions) {
    accountIdList.push(action.sender_id);
    accountIdList.push(action.receiver_id);
    tokenList.push(action.token_id);
  }

  const userTokens = await userFields.getUserFields({
    key: 'token_id',
    near_wallet_id: accountIdList,
    value: tokenList,
  });
  for (const userToken of userTokens) {
    let stakedParas = new BN('0');
    if (userToken.value === config.paras.token_contract) {
      stakedParas = await contractUtils.getStakedParas(userToken.near_wallet_id);
    }
    const newAmount = await contractUtils.getBalanceOf(userToken.value, userToken.near_wallet_id);
    const total = new BN(newAmount).add(stakedParas);
    const rolesByField = await contractUtils.getRulesByField('token_id', userToken.value);
    const guild_ids = [];
    rolesByField.forEach(item => {
      guild_ids.push(item.guild_id);
    });
    const _userInfos = await userInfos.getUsers({
      guild_id: guild_ids,
      near_wallet_id: userToken.near_wallet_id,
    });
    for (const _userInfo of _userInfos) {
      const member = await discordUtils.getMember(_userInfo.guild_id, _userInfo.user_id);
      const guildRoles = rolesByField.filter(role => role.guild_id == _userInfo.guild_id);

      const roles = [];
      const delRoles = [];
      for (const { fields, role_id, key_field } of guildRoles) {
        if (key_field[0] != 'token_id' || key_field[1] != userToken.value) {
          continue;
        }
        if (!member._roles.includes(role_id) && total.cmp(new BN(fields.token_amount)) != -1) {
          roles.push(role_id);
        }
        if (member._roles.includes(role_id) && total.cmp(new BN(fields.token_amount)) == -1) {
          delRoles.push(role_id);
        }
      }

      for (const role of roles) {
        try {
          await member.roles.add(role).then(logger.info(`${member.user.username} add role_id ${role} in token_task`));
        }
        catch (e) {
          continue;
        }
      }

      for (const role of delRoles) {
        try {
          await member.roles.remove(role).then(logger.info(`${member.user.username} remove role_id ${role} in token_task`));
        }
        catch (e) {
          continue;
        }

      }
    }
  }
};

module.exports = token_task;