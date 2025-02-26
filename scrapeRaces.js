const fs = require("fs").promises;
const axios = require("axios");
const { default: axiosRetry } = require("axios-retry");
const path = require("path");

axiosRetry(axios, { retries: 3 });

async function downloadRace(raceNo) {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
  const url = `https://racing.hkjc.com/racing/information/Chinese/racing/RaceCard.aspx?RaceDate=${today}&Racecourse=HV&RaceNo=${raceNo}`;
  const filename = path.join(
    "races",
    "html",
    `race_planned_${today.replace(/\//g, "-")}_race_${raceNo}.html`
  );

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (response.data.includes("尚未出版")) {
      console.log(`Skipping Race ${raceNo} (尚未出版)`);
      return;
    }

    // Check if file exists and compare content
    let existingContent = "";
    try {
      existingContent = await fs.readFile(filename, "utf8");
    } catch {
      // File doesn't exist - proceed with download
    }

    if (existingContent === response.data) {
      console.log(`Skipping Race ${raceNo} (content unchanged)`);
      return;
    }

    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, response.data);
    console.log(`Saved: ${filename}`);
  } catch (error) {
    console.error(`Failed Race ${raceNo}: ${error.message}`);
  }
}

async function delay(ms) {
  return await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

(async () => {
  for (let raceNo = 1; raceNo <= 15; raceNo++) {
    await downloadRace(raceNo);
    await delay(1000); // Add a delay between requests
  }
})();