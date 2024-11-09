export function register() {
  const schedule = require("node-schedule");
  const meal = async (type: string) => {
    await fetch("https://discord.com/api/webhooks/1304123855434027108/1kUrRaXalIm0AOiFefEBMHAwdrDZQ4P0oT_uD_ZI5Z2Md35K_qCaP_qYR4q0JZYQhuF9", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "<@222535932190916609>",
        embeds: [
          {
            author: {
              name: "Reminder",
              icon_url:
                "https://cdn.discordapp.com/attachments/589129097716695142/1304654906950684772/logo2-01.png?ex=67302e11&is=672edc91&hm=511b47d38489a5892714da23ee900ae311a06a0f23ebbe1ae6b8fb32c563f481&",
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
}
