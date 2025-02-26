const fs = require('fs');
const path = require('path');

// Get command line arguments
const [providedDate, providedRaceNo] = process.argv.slice(2);

if (!providedDate || !providedRaceNo) {
  console.error('Usage: node generatePrompt.js <date> <raceNo>');
  process.exit(1);
}

// Read race card data
const racesPath = path.join(__dirname, 'races', 'json');
const raceFiles = fs.readdirSync(racesPath)
  .filter(f => f.startsWith(`race_planned_${providedDate}_race_${providedRaceNo}`));

if (raceFiles.length === 0) {
  console.error('No matching race card found');
  process.exit(1);
}

// Read the first matching file
const raceData = JSON.parse(fs.readFileSync(
  path.join(racesPath, raceFiles[0]),
  'utf8'
));

// Get horses and their details
const horses = raceData.horses;

// Search for relevant results in results folder
const resultsPath = path.join(__dirname, 'results', 'json');
const resultFiles = fs.readdirSync(resultsPath)
  .filter(f => f.endsWith('.json'));

let performances = [];

resultFiles.forEach(resultFile => {
  const resultData = JSON.parse(fs.readFileSync(
    path.join(resultsPath, resultFile),
    'utf8'
  ));

  // Check each race in results file
  resultData.races.forEach(raceResult => {
    // Compare with horses from race card
    horses.forEach(horse => {
      // Look for matches based on horse name OR jockey
      const match = raceResult.results.find(res => 
        res.horseName === horse.name || res.jockey === horse.jockey
      );

      if (match) {
        performances.push({
          horseNumber: horse.number,
          horseName: horse.name,
          jockey: horse.jockey,
          recentForm: horse.recentForm,
          rating: horse.rating,
          performance: match.position
        });
      }
    });
  });
});

// Generate prompt
const prompt = `Based on the following information about an upcoming horse race, predict the likely finishing order. Focus on each horse's recent form and any patterns that might indicate potential outcomes.

Race Details:
- Date: ${raceData.date}
- Track: ${raceData.track}
- Distance: ${raceData.distance}
- Going: "${raceData.going}"
- Prize Money: ${raceData.prizeMoney}

Horses in the Race:

${performances
  .map(horse => `- Horse #${horse.horseNumber} (${horse.horseName}) - Jockey: ${horse.jockey}, Rating: ${horse.rating}, Recent Form: ${horse.recentForm}`)
  .join('\n')}

Please provide your prediction of the finishing order, considering factors like form consistency, jockey performance, and any potential upsets.`;

console.log(prompt);
