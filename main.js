let movies = [];
let genres = [];
let genreColors = {};
let tooltip;
let table;

let minRating, maxRating;

function preload() {
  // Use your local CSV file path here
  let csvUrl = "movies.csv"; 
  table = loadTable(csvUrl, "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  tooltip = select('#tooltip');
  tooltip.style('display', 'none');

  processTable();
  scaleCanvasToFit();
}

function generateColor() {
  return color(random(50, 255), random(50, 255), random(50, 255));
}

function processTable() {
  if (!table) {
    console.error("Table not loaded!");
    return;
  }

  // Create movies array and genres/colors
  for (let r = 0; r < table.getRowCount(); r++) {
    let row = table.getRow(r);

    let title = row.get("Series_Title") || "Untitled";
    let year = +row.get("Released_Year") || 0;
    let rating = +row.get("IMDB_Rating") || 0;
    let genreList = (row.get("Genre") || "").split(",");

    genreList.forEach(genreRaw => {
      let genre = genreRaw.trim();
      if (!genre) return;

      if (!genres.includes(genre)) {
        genres.push(genre);
        genreColors[genre] = generateColor();
      }

      movies.push({
        title,
        year,
        genre,
        rating,
        x: 0,
        y: random(-height, 0),
        speed: random(1, 3)
      });
    });
  }

  // Assign X positions by genre clusters
  let genrePositions = {};
  genres.forEach((g, idx) => {
    genrePositions[g] = map(idx, 0, genres.length - 1, 100, width - 100);
  });

  movies.forEach(m => {
    m.x = genrePositions[m.genre] + random(-50, 50);
  });

  // Determine min and max ratings for size mapping
  let ratings = movies.map(m => m.rating);
  minRating = Math.min(...ratings);
  maxRating = Math.max(...ratings);
}

// Scale canvas height if the tallest stack exceeds window height
function scaleCanvasToFit() {
  let stacks = {};
  let tallest = 0;

  // Simulate stacking to calculate tallest stack
  movies.forEach(m => {
    let size = map(m.rating, minRating, maxRating, 5, 50);
    let xKey = Math.round(m.x / 10);

    if (!stacks[xKey]) stacks[xKey] = [];
    let targetY = 0; // bottom relative, we'll invert later

    if (stacks[xKey].length > 0) {
      let topBall = stacks[xKey][stacks[xKey].length - 1];
      let topSize = map(topBall.rating, minRating, maxRating, 5, 50);
      targetY = topBall.stackY - topSize / 2 - size / 2;
    } else {
      targetY = 0;
    }

    m.stackY = targetY;
    stacks[xKey].push(m);

    tallest = Math.max(tallest, stacks[xKey].length > 0 ? stacks[xKey][stacks[xKey].length - 1].stackY + size / 2 : size / 2);
  });

  // If tallest stack > windowHeight, scale all Y positions
  if (tallest > height) {
    let scaleY = height / tallest;
    movies.forEach(m => {
      m.stackY = m.stackY * scaleY;
    });
  }
}

function draw() {
  background(30);

  let hoveredMovie = null;
  let hoveredDistance = Infinity;

  // Rebuild stacks each frame
  let stacks = {};

  movies.forEach(m => {
    let size = map(m.rating, minRating, maxRating, 5, 50);
    let xKey = Math.round(m.x / 10);

    if (!stacks[xKey]) stacks[xKey] = [];
    let targetY = height - size / 2;

    if (stacks[xKey].length > 0) {
      let topBall = stacks[xKey][stacks[xKey].length - 1];
      let topSize = map(topBall.rating, minRating, maxRating, 5, 50);
      targetY = topBall.y - topSize / 2 - size / 2;
    }

    // Falling animation
    if (m.y + size / 2 < targetY) {
      m.y += m.speed;
    } else {
      m.y = targetY;
      m.speed = 0;
      stacks[xKey].push(m);
    }

    // Draw ball
    fill(genreColors[m.genre]);
    noStroke();
    ellipse(m.x, m.y, size);

    // Hover detection
    let d = dist(mouseX, mouseY, m.x, m.y);
    if (d < size / 2 && d < hoveredDistance) {
      hoveredMovie = m;
      hoveredDistance = d;
    }
  });

  // Tooltip
  if (hoveredMovie) {
    tooltip.html(
      `${hoveredMovie.title}<br>${hoveredMovie.genre}<br>Rating: ${hoveredMovie.rating.toFixed(1)}<br>Year: ${hoveredMovie.year}`
    );
    tooltip.position(mouseX + 10, mouseY + 10);
    tooltip.style('display', 'block');
  } else {
    tooltip.style('display', 'none');
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  scaleCanvasToFit();
}
