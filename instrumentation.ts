import { env } from "env.mjs";

export function register() {
  const schedule = require("node-schedule");
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

  const breakfastRule = new schedule.RecurrenceRule();
  breakfastRule.hour = 9;
  breakfastRule.minute = 0;
  breakfastRule.tz = "America/Detroit";

  const lunchRule = new schedule.RecurrenceRule();
  lunchRule.hour = 13;
  lunchRule.minute = 0;
  lunchRule.tz = "America/Detroit";

  const dinnerRule = new schedule.RecurrenceRule();
  dinnerRule.hour = 19;
  dinnerRule.minute = 0;
  dinnerRule.tz = "America/Detroit";

  schedule.scheduleJob(breakfastRule, function () {
    meal("Breakfast");
  });
  schedule.scheduleJob(lunchRule, function () {
    meal("Lunch");
  });
  schedule.scheduleJob(dinnerRule, function () {
    meal("Dinner");
  });

  const testRule = new schedule.RecurrenceRule();
  testRule.hour = 10;
  testRule.minute = 50;
  testRule.tz = "America/Detroit";
  schedule.scheduleJob(testRule, function () {
    console.log("TESTTESTTEST");
    meal("TEST");
  });
}
