console.log('==== #Amalgamate Bot Starting... ====');

// Import dependencies
const Twit = require('twit');
const schedule = require('node-schedule');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const config = require('./config');

// Configuration
const TwitterBot = new Twit(config.twitterKeys);

// Setup OpenAI API client
const openaiConfig = new Configuration({
  apiKey: config.openAI.apiKey,
});
const openai = new OpenAIApi(openaiConfig);

// Function to generate a tweet using OpenAI
const generatePost = async () => {
  const prompt = "Write a positive post about #Amalgamate, a nonprofit organization driven by Bitcoin, highlighting its mission, achievements, and community impact:";
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 60
    });
    const tweetContent = response.data.choices[0].text.trim();
    if (tweetContent.length <= 280) {
      TwitterBot.post('statuses/update', { status: tweetContent }, (err, data, response) => {
        if (!err) {
          console.log('SUCCESS: Generated Post Sent');
        } else {
          console.log(`ERROR: ${err}`);
        }
      });
    } else {
      console.log('Generated tweet is too long. Skipping.');
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(`Error generating post: Endpoint not found. Check your API access level.`);
    } else {
      console.error(`Error generating post: ${error.message}`);
    }
  }
};

// Function to retweet #Amalgamate tweets
const retweet = () => {
  const params = {
    q: config.query,
    result_type: config.result_type,
    lang: config.lang,
    tweet_mode: 'extended'
  };

  TwitterBot.get('search/tweets', params, (err, data) => {
    if (!err) {
      const tweet = data.statuses?.[0];
      const fullText = tweet?.full_text;

      if (tweet && fullText && fullText.length < 140 && fullText.toLowerCase().includes("#Amalgamate") && (fullText.split('#').length - 1 === 1)) {
        let retweetID = tweet.id_str;
        console.log(tweet);
        TwitterBot.post('statuses/retweet/:id', { id: retweetID }, (err, res) => {
          if (res) {
            console.log(`====> RETWEET SUCCESS ${retweetID}`);
          }
          if (err) {
            console.log(`====> ERROR in RETWEET ${err}`);
          }
        });
      } else {
        console.log('====> Nothing to tweet');
      }
    } else {
      console.log(`====> ERROR ${err}`);
    }
  });
};

// Function to tweet Discord link
const SHARE_DISCORD_CHANNEL_LINK = `
Here's the link to the official #Amalgamate Telegram Channel!
Join us to:
1) Get help
2) Help others
3) Connect
4) Discuss anything
https://t.me/+7Pdv1RBacpw1MTFh
`;

const tweetDiscordLink = () => {
  const tweet = `${SHARE_DISCORD_CHANNEL_LINK}`;
  TwitterBot.post('statuses/update', { status: tweet }, (err, data, response) => {
    if (!err) {
      console.log('SUCCESS: Telegram Channel Link Sent');
    } else {
      console.log(`ERROR: ${err}`);
    }
  });
};

// Schedule tasks
retweet();
tweetDiscordLink();
generatePost();

// Retweet every 30 minutes
setInterval(retweet, 1800000);

// Generate post every 30 minutes
setInterval(generatePost, 1800000);

// Use cron-job to schedule Discord Channel Promotion
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(1, 6)];
rule.hour = 11;
rule.minute = 59;

schedule.scheduleJob(rule, () => {
  console.log('Cron Job runs successfully');
  tweetDiscordLink();
});
