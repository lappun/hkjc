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

const horsePerformances = {};
const jockeyPerformances = {};

resultFiles.forEach(resultFile => {
  const resultData = JSON.parse(fs.readFileSync(
    path.join(resultsPath, resultFile),
    'utf8'
  ));

  resultData.races.forEach(raceResult => {
    horses.forEach(horse => {
      // Track horse performances
      const horseMatch = raceResult.results.find(res =>
        res.horseName === horse.name
      );

      if (horseMatch) {
        if (!horsePerformances[horse.name]) {
          horsePerformances[horse.name] = [];
        }
        // Keep only last 3 matches with newest first
        // Store object with position and race title
        const entry = { 
          position: horseMatch.position,
          raceTitle: raceResult.title
        };
        if (horsePerformances[horse.name].length < 3) {
          horsePerformances[horse.name].unshift(entry);
        }
      }

      // Track jockey performances
      const jockeyMatch = raceResult.results.find(res =>
        res.jockey === horse.jockey
      );

      if (jockeyMatch) {
        if (!jockeyPerformances[horse.jockey]) {
          jockeyPerformances[horse.jockey] = [];
        }
        // Keep only last 3 matches with newest first
        const entry = {
          position: jockeyMatch.position,
          raceTitle: raceResult.title
        };
        if (jockeyPerformances[horse.jockey].length < 3) {
          jockeyPerformances[horse.jockey].unshift(entry);
        }
      }
    });
  });
});

// Generate prompt
const prompt = `Based on the following information about an upcoming horse race, predict the likely finishing order. Focus on each horse's recent form and any patterns that might indicate potential outcomes.

Race Details:
- Title: "${raceData.title}"
- Date: ${raceData.date}
- Track: ${raceData.track}
- Distance: ${raceData.distance}
- Going: "${raceData.going}"
- Prize Money: ${raceData.prizeMoney}

Horses in the Race:

${horses.map(horse => {
  const horseHistory = horsePerformances[horse.name] || [];
  const jockeyHistory = jockeyPerformances[horse.jockey] || [];

  return `- Horse #${horse.number} (${horse.name})
   Jockey: ${horse.jockey}
   Recent Jockey Form: ${jockeyHistory.slice(-3).map(e => 
     `${e.position} (${e.raceTitle})`
   ).join(', ') || 'No recent data'}
   Horse Form: ${horse.recentForm.split('/').slice(0, 3).join('/')}
   Past Performances: ${horseHistory.slice(-3).map(e => 
     `${e.position} (${e.raceTitle})`
   ).join(', ') || 'No recent data'}
   Rating: ${horse.rating}`;
}).join('\n\n')}

Please provide your prediction of the finishing order, considering factors like form consistency, jockey performance, and any potential upsets.`;

console.log(prompt);
