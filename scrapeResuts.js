const fs = require("fs").promises;
const axios = require("axios");
const { default: axiosRetry } = require("axios-retry");
const path = require("path");

axiosRetry(axios, { retries: 3 });

function generateDates(start, end) {
  const dates = [];
  let current = new Date(end);
  const startDate = new Date(start);

  while (current >= startDate) {
    dates.push(current.toISOString().split("T")[0].replace(/-/g, "/"));
    current.setDate(current.getDate() - 1);
  }

  return dates;
}

async function downloadPage(date) {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
  if (date >= today) {
    console.log(`Skipping ${date} (date is today or in the future)`);
    return;
  }

  const url = `https://racing.hkjc.com/racing/information/Chinese/Racing/ResultsAll.aspx?RaceDate=${date}`;
  const filename = path.join(
    "results",
    "html",
    `race_results_${date.replace(/\//g, "-")}.html`
  );

  try {
    // Check if file exists
    try {
      await fs.access(filename);
      console.log(`Skipping ${date} (file exists)`);
      return true; // Indicate that the file exists
    } catch {
      // File doesn't exist - proceed with download
    }

    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (response.data.includes("沒有相關資料")) {
      console.log(`Skipping ${date} (URL not exists)`);
      return;
    }
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, response.data);
    console.log(`Saved: ${filename}`);
  } catch (error) {
    console.error(`Failed ${date}: ${error.message}`);
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
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1); // Start from yesterday
  const endDate = new Date(startDate);
  endDate.setFullYear(startDate.getFullYear() - 1); // One year range

  for (const date of generateDates(endDate.toISOString().split("T")[0], startDate.toISOString().split("T")[0])) {
    const fileExists = await downloadPage(date);
    if (fileExists) {
      console.log(`Stopping job as file exists for date: ${date}`);
      break; // Stop runtime if file exists
    }
    await delay(1000);
  }
})();
