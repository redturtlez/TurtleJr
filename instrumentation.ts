export function register() {
  const { CronJob } = require("cron");
  const { env } = require("env.mjs");
  const meal = async (type: string) => {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: env.DISCORD_PING,
        embeds: [
          {
            author: {
              name: "Reminder",
              icon_url: "https://i.imgur.com/OCLTEjS.png",
            },
            description: "# " + type + " \n[turtlejr.dev](https://turtlejr.dev)",
            color: 65535,
          },
        ],
      }),
    });
  };

  const breakfastJob = new CronJob(
    "0 9 * * *", // cronTime
    function () {
      meal("Breakfast");
    }, // onTick
    null, // onComplete
    true, // start
    "America/Detroit", // timeZone
  );
  const lunchJob = new CronJob(
    "0 13 * * *", // cronTime
    function () {
      meal("Lunch");
    }, // onTick
    null, // onComplete
    true, // start
    "America/Detroit", // timeZone
  );
  const dinnerJob = new CronJob(
    "0 19 * * *", // cronTime
    function () {
      meal("Dinner");
    }, // onTick
    null, // onComplete
    true, // start
    "America/Detroit", // timeZone
  );

  const testJob = new CronJob(
    "4 11 * * *", // cronTime
    function () {
      meal("Dinner");
    }, // onTick
    null, // onComplete
    true, // start
    "America/Detroit", // timeZone
  );
  // const breakfastRule = new schedule.RecurrenceRule();
  // breakfastRule.hour = 9;
  // breakfastRule.minute = 0;
  // breakfastRule.tz = "America/Detroit";

  // const lunchRule = new schedule.RecurrenceRule();
  // lunchRule.hour = 13;
  // lunchRule.minute = 0;
  // lunchRule.tz = "America/Detroit";

  // const dinnerRule = new schedule.RecurrenceRule();
  // dinnerRule.hour = 19;
  // dinnerRule.minute = 0;
  // dinnerRule.tz = "America/Detroit";

  // schedule.scheduleJob(breakfastRule, function () {
  //   meal("Breakfast");
  // });
  // schedule.scheduleJob(lunchRule, function () {
  //   meal("Lunch");
  // });
  // schedule.scheduleJob(dinnerRule, function () {
  //   meal("Dinner");
  // });

  // const testRule = new schedule.RecurrenceRule();
  // testRule.hour = 10;
  // testRule.minute = 50;
  // testRule.tz = "America/Detroit";
  // schedule.scheduleJob(testRule, function () {
  //   console.log("TESTTESTTEST");
  //   meal("TEST");
  // });
}
