const { TwitterApi } = require('twitter-api-v2');
const twitterClient = require('../../service/twitter_app');
const oauthCache = require('../../pkg/models/object/oauth_cache');
const config = require('../../pkg/utils/config');
const twitterUsers = require('../../pkg/models/object/twitter_users');
const twitterRules = require('../../pkg/models/object/twitter_rules');
const twitterRulesMsg = require('../../pkg/models/object/twitter_rules_msg');
const timeUtils = require('../../pkg/utils/time_utils');
const discordUtils = require('./discord_utils');
const logger = require('./logger');


exports.generateOAuthLink = async (interaction) => {
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(config.twitter.callback_url, { scope: ['tweet.read', 'users.read', 'offline.access', 'follows.read', 'like.read'] });
  await oauthCache.add({
    state: state,
    code_verifier: codeVerifier,
  });
  const result = await twitterUsers.get({
    user_id: interaction.user.id,
  });
  if (result) {
    await twitterUsers.update({ state: state }, {
      user_id: interaction.user.id,
    });
  }
  else {
    await twitterUsers.add({
      user_id: interaction.user.id,
      state: state,
    });
  }

  await twitterRulesMsg.add({
    user_id: interaction.user.id,
    guild_id: interaction.guildId,
    channel_id: interaction.channelId,
    message_id:interaction.message.id,
    twitter_state: state,
  });

  return url;
};
// this.generateOAuthLink('456', '789').then(console.log);

exports.isTimeExpired = async (time) => {
  const date = new Date(time).getTime();
  const currDate = new Date().getTime();
  if (date <= currDate) {
    return true;
  }
  else {
    return false;
  }
};
// this.isTimeExpired('2022-09-01 05:53:22').then(console.log);

exports.getClient = async (userId) => {
  const twitterUser = await twitterUsers.get({ user_id: userId });
  if (await this.isTimeExpired(twitterUser.expired_at)) {
    const { client: refreshedClient, accessToken, refreshToken: newRefreshToken } = await twitterClient.refreshOAuth2Token(twitterUser.refresh_token);
    const params = { access_token: accessToken, refresh_token: newRefreshToken, expired_at: await timeUtils.getExpiredTimeBySecond(7200) };
    const condition = { user_id: userId };
    await twitterUsers.update(params, condition);
    return refreshedClient;
  }
  return new TwitterApi(twitterUser.access_token);
};
// this.getClient('966966468774350948', '912438768043196456');

/**
 * @description https://developer.twitter.com/en/docs/twitter-api/users/follows/api-reference/get-users-id-followers
 * @param {string} userId
 * @param {string} next_token
 * @returns
 */
exports.listUserFollowing = async (userClient, userId, next_token) => {
  if (next_token) {
    return await userClient.v2.get(`users/${userId}/following`, { pagination_token: next_token, max_results: 1000 });
  }
  return await userClient.v2.get(`users/${userId}/following`, { max_results: 1000 });
};
// this.listUserFollower('1169439457').then(console.log);

/**
 *
 * @param {string} userId
 * @param {string} followerId
 * @returns boolean
 */
exports.isUserFollowing = async (userClient, userId, followingUsername) => {
  try {
    let result = await this.listUserFollowing(userClient, userId);
    let isUserFollowing = result.data.some(element => element.username == followingUsername);
    if (isUserFollowing) {
      return true;
    }
    else {
      do {
        result = await this.listUserFollowing(userClient, userId, result.meta.next_token);
        if (result.data && result.data.some(element => element.username == followingUsername)) {
          isUserFollowing = true;
          break;
        }
      } while (result.meta.next_token);
    }
    return isUserFollowing;
  }
  catch (e) {
    return false;
  }

};
// this.isUserFollowing('430789183', '1169439457').then(console.log);

/**
 * @description https://developer.twitter.com/en/docs/twitter-api/tweets/retweets/api-reference/get-tweets-id-retweeted_by
 * @param {string} tweetId
 * @param {string} next_token
 * @returns
 */
exports.listRetweetedById = async (userClient, tweetId, next_token) => {
  if (next_token) {
    return await userClient.v2.get(`tweets/${tweetId}/retweeted_by`, { pagination_token: next_token, max_results: 100 });
  }
  return await userClient.v2.get(`tweets/${tweetId}/retweeted_by`, { max_results: 100 });
};
// this.listRetweetedById('1564034348881367040').then(e => console.log(e.data.length));

/**
 *
 * @param {string} tweetId
 * @param {string} userId
 * @returns boolean
 */
exports.isUserRetweeted = async (userClient, tweetId, userId) => {
  try {
    let result = await this.listRetweetedById(userClient, tweetId);
    let isUserRetweeted = result.data.some(element => element.id == userId);
    if (isUserRetweeted) {
      return true;
    }
    else {
      do {
        result = await this.listRetweetedById(userClient, tweetId, result.meta.next_token);
        if (result.data && result.data.some(element => element.id == userId)) {
          isUserRetweeted = true;
          break;
        }
      } while (result.meta.next_token);
    }
    return isUserRetweeted;
  }
  catch (e) {
    logger.error(e);
    return false;
  }

};
// this.isUserRetweeted('1564034348881367040', '430789183').then(console.log);

/**
 * @description https://developer.twitter.com/en/docs/twitter-api/tweets/retweets/api-reference/get-tweets-id-retweeted_by
 * @param {string} tweetId
 * @param {string} next_token
 * @returns
 */
exports.listLikedTweetById = async (userClient, userId, next_token) => {
  if (next_token) {
    return await userClient.v2.get(`users/${userId}/liked_tweets`, { pagination_token: next_token, max_results: 100 });
  }
  return await userClient.v2.get(`users/${userId}/liked_tweets`, { max_results: 100 });
};
// this.listRetweetedById('1564034348881367040').then(e => console.log(e.data.length));

/**
 *
 * @param {string} tweetId
 * @param {string} userId
 * @returns boolean
 */
exports.isUserLikedTweet = async (userClient, tweetId, twitterId) => {
  try {
    let result = await this.listLikedTweetById(userClient, twitterId);
    let isUserLiked = result.data.some(element => element.id == tweetId);
    if (isUserLiked) {
      return true;
    }
    else {
      do {
        result = await this.listLikedTweetById(userClient, twitterId, result.meta.next_token);
        if (result.data && result.data.some(element => element.id == tweetId)) {
          isUserLiked = true;
          break;
        }
      } while (result.meta.next_token);
    }
    return isUserLiked;
  }
  catch (e) {
    logger.error(e);
    return false;
  }

};
// this.isUserRetweeted('1564034348881367040', '430789183').then(console.log);


exports.listFollowUserName = async (followUerName) => {
  return followUerName.split(', ').map(element => {
    return element.split('@').at(-1);
  });
};
// this.listFollowUserName('@test, @test').then(console.log);

exports.listTweetLink = async (tweetLink) => {
  return tweetLink.split('+').map(element => {
    return element.split('/').at(-1).split('?')[0];
  });
};
// this.listTweetLink('https://twitter.com/beepopula/status/1566726219797737473?s=20&t=OaDUKnttKJcv9-0ajBseCQ').then(console.log);

exports.verifyRuleFromInteraction = async (userClient, interaction) => {
  const userId = interaction.user.id;
  const message = interaction.message;
  return await this.verifyRule(message, userId, userClient);
};

exports.verifyRuleFromDB = async (userClient, twitterRuleMsg, discordMsg) => {
  const userId = twitterRuleMsg.user_id;
  return await this.verifyRule(discordMsg, userId, userClient);
};

exports.verifyRule = async (message, userId, userClient) => {
  const guildId = message.guildId;
  const twitterUser = await twitterUsers.get({ user_id: userId });
  const twitterId = twitterUser.twitter_id;
  const attachedMsgs = message.embeds[0].fields;
  const guild = await discordUtils.getGuild(guildId);
  let roleId, roleName;
  const resultMsgs = [];
  for (const attachMsg of attachedMsgs) {
    if (attachMsg.name == 'Role') {
      roleId = await guild.roles.fetch().then(e => e.find(r => r.name === attachMsg.value.split('@').at(-1)).id);
      roleName = attachMsg.value;
      if (await discordUtils.isMemberIncludeRole(guildId, userId, roleId)) {
        const resultMsg = {};
        resultMsg.name = 'Already in role';
        resultMsg.value = `✅ You are already in this role ${roleName}.`;
        resultMsgs.push(resultMsg);
        logger.info(`${JSON.stringify(resultMsg)}`);
        return resultMsgs;
      }
    }
    // Follow
    else if (attachMsg.name == 'Follow') {
      const followUsers = await this.listFollowUserName(attachMsg.value);
      for (const followUser of followUsers) {
        if (!await this.isUserFollowing(userClient, twitterId, followUser)) {
          const resultMsg = {};
          resultMsg.name = 'Follow';
          resultMsg.value = `❌ Sorry, you don't meet the requirements for this role.\n Must: follow @${followUser} https://twitter.com/${followUser}`;
          resultMsgs.push(resultMsg);
          logger.info(`${JSON.stringify(resultMsg)}`);
        }
      }
    }
    // Rt_Tweet
    else if (attachMsg.name == 'Rt_Tweet') {
      const rtTweetIds = await this.listTweetLink(attachMsg.value);
      for (const rtTweetId of rtTweetIds) {
        if (!await this.isUserRetweeted(userClient, rtTweetId, twitterId)) {
          const resultMsg = {};
          resultMsg.name = 'rt_tweet';
          resultMsg.value = `❌ Sorry, you don't meet the requirements for this role.\n Must: retweet tweet ${attachMsg.value.split('+').find(e => e.includes(rtTweetId))}`;
          resultMsgs.push(resultMsg);
          logger.info(`${JSON.stringify(resultMsg)}`);
        }
      }
    }
    // Like_Tweet
    else if (attachMsg.name == 'Like_Tweet') {
      const likeTweetIds = await module.exports.listTweetLink(attachMsg.value);
      for (const tweetId of likeTweetIds) {
        if (!await this.isUserLikedTweet(userClient, tweetId, twitterId)) {
          const resultMsg = {};
          resultMsg.name = 'like_tweet';
          resultMsg.value = `❌ Sorry, you don't meet the requirements for this role.\n Must: like tweet ${attachMsg.value.split('+').find(e => e.includes(tweetId))}`;
          resultMsgs.push(resultMsg);
          logger.info(`${JSON.stringify(resultMsg)}`);
        }
      }
    }

  }

  if (resultMsgs.length == 0) {
    const memberInGuild = await discordUtils.getMemberInGuild(guildId, userId);
    await memberInGuild.roles.add(roleId).then(logger.info(`${memberInGuild.user.username} add role_id ${roleId}(name: ${roleName}) in twitter_utils`)).catch(e => logger.error(e));
    const resultMsg = {};
    resultMsg.name = 'Add role success';
    resultMsg.value = `✅ Role Assigned: ${roleName}`;
    resultMsgs.push(resultMsg);
    logger.info(`${JSON.stringify(resultMsg)}`);
    return resultMsgs;
  }
  else {
    return resultMsgs;
  }
};
