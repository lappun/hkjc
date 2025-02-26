const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Path configuration
const INPUT_DIR = path.join(__dirname, "races/html");
const OUTPUT_DIR = path.join(__dirname, "races/json");

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function parseRaceCard(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const race = {};

  // Extract race details
  const raceDetails = document.querySelector(".f_fs13.font_wb");
  if (raceDetails) {
    race.title = raceDetails.textContent.trim();
  }

  const raceInfo = document.querySelector(".f_fs13");
  if (raceInfo) {
    const infoText = raceInfo.textContent.trim();
    const [date, location, track, distance, going, prizeMoney, rating] = infoText.split(", ");

    race.date = date;
    race.location = location;
    race.track = track;
    race.distance = distance;
    race.going = going;
    race.prizeMoney = prizeMoney;
    race.rating = rating;
  }

  // Extract horses
  race.horses = [];
  const horseRows = document.querySelectorAll("table.starter tbody tr");
  horseRows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length >= 10) {
      const horse = {
        number: cells[0].textContent.trim(),
        recentForm: cells[1].textContent.trim(),
        color: cells[2].querySelector("img")?.src,
        name: cells[3].textContent.trim(),
        weight: cells[5].textContent.trim(),
        jockey: cells[6].textContent.trim(),
        barrier: cells[8].textContent.trim(),
        trainer: cells[9].textContent.trim(),
        rating: cells[11].textContent.trim(),
        ratingChange: cells[12].textContent.trim(),
        gear: cells[21].textContent.trim(),
      };
      race.horses.push(horse);
    }
  });

  return race;
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

      // Parse race card
      const race = parseRaceCard(html);

      // Write JSON output
      fs.writeFileSync(jsonPath, JSON.stringify(race, null, 2));
      console.log(`Processed: ${file} -> ${path.basename(jsonPath)}`);
    }

    console.log("Conversion completed!");
  } catch (error) {
    console.error("Error processing files:", error);
  }
}

// Run the processor
processFiles();