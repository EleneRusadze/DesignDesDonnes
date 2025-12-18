let movies = [];
let genres = [];
let genreColors = {};
let tooltip;
let table;

let minRating, maxRating;

// Global lane bounds (populated in processTable)
let genreLaneStart = {};
let genreLaneEnd = {};

// Margin constants
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 80; // increased bottom padding to make room for labels

function preload() {
  let csvUrl = "movies.csv";
  table = loadTable(csvUrl, "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  tooltip = select("#tooltip");
  tooltip.style("display", "none");

  processTable();
}

// --- Ball size helper ---
function getBallSize(rating) {
  return map(rating, minRating, maxRating, 2.5, 25);
}

function generateColor() {
  return color(random(50, 255), random(50, 255), random(50, 255));
}

function processTable() {
  if (!table) {
    console.error("Table not loaded!");
    return;
  }

  // Load movie data
  for (let r = 0; r < table.getRowCount(); r++) {
    let row = table.getRow(r);

    let title = row.get("Series_Title") || "Untitled";
    let year = +row.get("Released_Year") || 0;
    let rating = +row.get("IMDB_Rating") || 0;
    let genreList = (row.get("Genre") || "").split(",");

    genreList.forEach((genreRaw) => {
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
        speed: random(1, 3),
      });
    });
  }

  // Sort movies chronologically by year
  movies.sort((a, b) => a.year - b.year);

  // ----------- GROUP MOVIES BY GENRE -----------
  let moviesByGenre = {};
  movies.forEach((m) => {
    if (!moviesByGenre[m.genre]) moviesByGenre[m.genre] = [];
    moviesByGenre[m.genre].push(m);
  });

  let totalMovieCount = movies.length;

  // ----------- LANE WIDTHS WITH LEFT MARGIN + PADDING -----------
  const GENRE_GAP = 5;         // 5px gap between genres
  const innerPad = 0;          // No internal padding, use genre gap instead
  const paddingPerGenre = GENRE_GAP; // Gap after each genre

  // Usable width after margins and genre gaps
  let usableWidth = width - MARGIN_LEFT - MARGIN_RIGHT - genres.length * GENRE_GAP;

  let xCursor = MARGIN_LEFT;    // start from left margin

  // reset global lane bounds
  genreLaneStart = {};
  genreLaneEnd = {};

  genres.forEach((genre) => {
    let count = moviesByGenre[genre].length;
    let proportion = count / totalMovieCount;

    let laneWidth = proportion * usableWidth;

    // No internal padding, just use the calculated width
    let start = xCursor;
    let end = start + laneWidth;

    genreLaneStart[genre] = start;
    genreLaneEnd[genre] = end;

    // move cursor to end + genre gap
    xCursor = end + GENRE_GAP;
  });

  // ----------- DISTRIBUTE MOVIES INSIDE LANES -----------
  Object.keys(moviesByGenre).forEach((genre) => {
    let group = moviesByGenre[genre];
    let count = group.length;

    let laneStart = genreLaneStart[genre];
    let laneEnd = genreLaneEnd[genre];
    let laneWidth = laneEnd - laneStart;

    // Ideal stack height (how many balls per vertical column)
    let targetStackHeight = 60;

    let idealColumns = ceil(count / targetStackHeight);
    let maxColumnsAllowed = floor(laneWidth / 12); // one column per ~12px
    let columns = min(idealColumns, maxColumnsAllowed);
    if (columns < 1) columns = 1;

    // Calculate column width to fill the entire lane without gaps within genre
    let columnWidth = laneWidth / columns;

    group.forEach((m, index) => {
      let colIndex = index % columns;
      // Position at center of each column
      m.x = laneStart + (colIndex + 0.5) * columnWidth;
    });
  });

  // Determine rating range
  let ratings = movies.map((m) => m.rating);
  minRating = Math.min(...ratings);
  maxRating = Math.max(...ratings);
}

function draw() {
  background(30);

  // Headline centered at top
  push();
  fill(220);
  textAlign(CENTER, TOP);
  textSize(28);
  textStyle(BOLD);
  text("IMDB Top 1000 Movies", width / 2, 12);
  pop();

  let hoveredMovie = null;
  let hoveredDistance = Infinity;

  // Use a map keyed by genre + x bucket to avoid cross-genre stacking
  let stacks = {};

  movies.forEach((m) => {
    let size = getBallSize(m.rating);

    // Key now includes genre to prevent Drama/Crime mixing stacks
    let xBucket = Math.round(m.x / 10);
    let stackKey = `${m.genre}-${xBucket}`;

    if (!stacks[stackKey]) stacks[stackKey] = [];

    let targetY = height - size / 2 - MARGIN_BOTTOM;

    if (stacks[stackKey].length > 0) {
      let topBall = stacks[stackKey][stacks[stackKey].length - 1];
      let topSize = getBallSize(topBall.rating);
      targetY = topBall.y - topSize / 2 - size / 2;
    }

    // Falling animation
    if (m.y + size / 2 < targetY) {
      m.y += m.speed;
    } else {
      m.y = targetY;
      m.speed = 0;
      stacks[stackKey].push(m);
    }

    // Draw
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

    // ----- Top info panel (under header) -----
    // Panel sits below the headline and updates with hovered movie details
    {
      const headerY = 12;
      const headerH = 28;
      const panelGap = 8;
      const panelY = headerY + headerH + panelGap;
      const panelH = 64;
      const panelX = MARGIN_LEFT;
      const panelW = width - MARGIN_LEFT - MARGIN_RIGHT;

      push();
      // panel background
      noStroke();
      fill(40, 200); // subtle, slightly translucent panel
      rect(panelX, panelY, panelW, panelH, 8);

      // content
      fill(230);
      textAlign(LEFT, TOP);
      // Title area
      textSize(16);
      if (hoveredMovie) {
        textStyle(BOLD);
        // limit title width and allow wrapping if necessary
        text(hoveredMovie.title, panelX + 12, panelY + 10, panelW - 24, 36);
        textStyle(NORMAL);
        textSize(12);
        const details = `${hoveredMovie.genre} • Rating: ${hoveredMovie.rating.toFixed(1)}`;
        text(details, panelX + 12, panelY + 38);
      } else {
        textStyle(BOLD);
        textSize(14);
        fill(200);
        text("Hover a movie to see details", panelX + 12, panelY + 18);
        textSize(11);
        fill(170);
        text(`${movies.length} movies • ${genres.length} genres`, panelX + 12, panelY + 36);
      }

      pop();
    }

  // Draw genre labels under their lanes
  push();
  fill(200);
  noStroke();
  textSize(12);
  genres.forEach((g) => {
    let s = genreLaneStart[g];
    let e = genreLaneEnd[g];
    if (s === undefined || e === undefined) return;
    let cx = (s + e) / 2;
    let laneW = e - s;
    // measure text width for current size
    let tw = textWidth(g);
    // if text is wider than lane (or very narrow lane), draw vertically
    if (tw + 8 > laneW || laneW < 40) {
      push();
      // translate to center under lane, then rotate to draw vertically
      translate(cx, height - MARGIN_BOTTOM + 8 + tw / 2);
      rotate(-HALF_PI);
      textAlign(CENTER, CENTER);
      text(g, 0, 0);
      pop();
    } else {
      textAlign(CENTER, TOP);
      text(g, cx, height - MARGIN_BOTTOM + 6);
    }
  });
  pop();

  if (hoveredMovie) {
    tooltip.html(
      `${hoveredMovie.title}<br>${hoveredMovie.genre}<br>Rating: ${hoveredMovie.rating.toFixed(
        1
      )}<br>Year: ${hoveredMovie.year}`
    );
    
    // Position tooltip, adjusting for bottom/right overflow
    let tooltipWidth = 200; // approximate tooltip width
    let tooltipHeight = 80;  // approximate tooltip height
    let tooltipX = mouseX + 10;
    let tooltipY = mouseY + 10;
    
    // Adjust if tooltip goes off right edge
    if (tooltipX + tooltipWidth > window.innerWidth) {
      tooltipX = mouseX - tooltipWidth - 10;
    }
    
    // Adjust if tooltip goes off bottom edge
    if (tooltipY + tooltipHeight > window.innerHeight) {
      tooltipY = mouseY - tooltipHeight - 10;
    }
    
    tooltip.position(tooltipX, tooltipY);
    tooltip.style("display", "block");
  } else {
    tooltip.style("display", "none");
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
