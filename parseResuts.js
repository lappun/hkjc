const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Path configuration
const INPUT_DIR = path.join(__dirname, "results/html");
const OUTPUT_DIR = path.join(__dirname, "results/json");

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function parseRacingResults(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const races = [];

  // Select all race sections
  Array.from(document.querySelectorAll("div.f_fs13.margin_top15")).forEach(
    (raceDiv) => {
      const race = {};

      // Extract race number and title
      const titleDiv = raceDiv.querySelector("div.bg_blue");
      if (titleDiv) {
        const match = titleDiv.textContent.match(/第 (\d+) 場/);
        race.raceNumber = match ? match[1] : null;
        race.title = titleDiv.nextElementSibling?.textContent.trim() || "";
      }

      // Extract video links
      race.videos = [];
      const videoLinks = raceDiv.querySelectorAll("div > a.local");
      Array.from(videoLinks).forEach((video) => {
        race.videos.push({
          text: video.textContent.trim(),
          url: video.href,
        });
      });

      // Extract race results
      const resultsTable = raceDiv.querySelector("table.result");
      race.results = [];
      if (resultsTable) {
        Array.from(resultsTable.querySelectorAll("tbody tr")).forEach((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          if (cells.length >= 7) {
            race.results.push({
              position: cells[0].textContent.trim(),
              horseNumber: cells[1].textContent.trim(),
              horseName: cells[2].textContent.trim(),
              jockey: cells[3].textContent.trim(),
              trainer: cells[4].textContent.trim(),
              weight: cells[5].textContent.trim(),
              barrier: cells[6].textContent.trim(),
            });
          }
        });
      }

      // Extract dividends
      const dividendsTable = raceDiv.querySelector("table.dividends");
      race.dividends = [];
      let currentPool = null;

      if (dividendsTable) {
        Array.from(dividendsTable.querySelectorAll("tbody tr")).forEach(
          (row) => {
            const cells = Array.from(row.querySelectorAll("td"));
            const poolName = cells[0]?.textContent.trim();

            if (cells.length === 3) {
              // Main pool row
              if (currentPool) race.dividends.push(currentPool);
              currentPool = {
                pool: poolName,
                combinations: [
                  {
                    combination: cells[1].textContent.trim(),
                    payout: cells[2].textContent.trim(),
                  },
                ],
              };
            } else if (cells.length === 2) {
              // Sub-item of current pool
              if (currentPool) {
                currentPool.combinations.push({
                  combination: cells[0].textContent.trim(),
                  payout: cells[1].textContent.trim(),
                });
              }
            }
          }
        );
      }

      if (currentPool) race.dividends.push(currentPool);
      races.push(race);
    }
  );

  return {
    raceDate: document.querySelector("select#selectId option[selected]")?.value,
    races: races,
  };
}

// Process all HTML files
async function processFiles() {
  try {
    const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".html"));

    for (const file of files) {
      const htmlPath = path.join(INPUT_DIR, file);
      const jsonPath = path.join(OUTPUT_DIR, file.replace(".html", ".json"));

      try {
        await fs.accessSync(jsonPath);
        console.log(`Skipping ${jsonPath} (file exists)`);
        continue;
      } catch {
        // File doesn't exist - proceed with download
      }

      // Read HTML content
      const html = fs.readFileSync(htmlPath, "utf8");

      // Parse results
      const results = parseRacingResults(html);

      // Write JSON output
      fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
      console.log(`Processed: ${file} -> ${path.basename(jsonPath)}`);
    }

    console.log("Conversion completed!");
  } catch (error) {
    console.error("Error processing files:", error);
  }
}

// Run the processor
processFiles();
