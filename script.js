"use strict";

const gameBoard = document.querySelector("#gameBoard");
gameBoard.setAttribute("style", "width: 800px");
gameBoard.setAttribute("style", "height: 800px");
const restartButton = document.querySelector(".restart");
const canvasContainer = document.querySelector(".canvasContainer");
const ctx = gameBoard.getContext("2d");
const gameWidth = gameBoard.width;
const gameHeight = gameBoard.height;
const heroColor = "orangered";
const heroBorder = "black";
const unitSize = 25;
let running = false;
let hero = { x: gameWidth / 2 - unitSize / 2, y: gameHeight - unitSize * 2 };
let isJumping = false;
let jumpSpeed = 7;
let xVelocity = 0;
let jumpDistance = 0; // Track current jump distance
const gravity = 9; // Adjust gravity as needed
let heroSpeed = 0; // Current hero speed
let maxSpeed = 12; // Max hero speed
let acceleration = 0.5;
let deceleration = 0.8;
let wallBounceBoost = 2;

let time = 1;
let timeIntervalId = null;

let jumpHeight = calculateJumpHeight();

let score = 0;
let scoreMultiplier = 1;

let leftPressed = false;
let rightPressed = false;
let spacePressed = false;
let removeStartingPlatform = false;
let gameStarted = false;
let currentDirection = "RIGHT";
let isStatic = heroSpeed === 0 ? true : false;

const startingPlatform = {
  x: 0,
  y: gameHeight - unitSize,
  width: gameWidth,
  height: unitSize,
  visible: true,
};

let shelves = [
  {
    x: 0,
    y: 650,
    width: gameWidth,
    height: unitSize,
  },
  {
    x: 100,
    y: 500,
    width: 300,
    height: unitSize,
  },
  {
    x: 300,
    y: 350,
    width: 300,
    height: unitSize,
  },
  {
    x: 0,
    y: 200,
    width: 250,
    height: unitSize,
  },
  {
    x: 500,
    y: 100,
    width: 250,
    height: unitSize,
  },
  {
    x: 200,
    y: 0,
    width: 250,
    height: unitSize,
  },
];

// Boosts
let jetpackInUse = false;
let jetpackDuration = 5;
let jetpackIntervalId = null;
const jetpackPower = 12;

const flameSprites = [new Image(), new Image(), new Image()];

flameSprites[0].src = "./assets/flame1.png";
flameSprites[1].src = "./assets/flame2.png";
flameSprites[2].src = "./assets/flame3.png";

const backgroundImage = new Image();
backgroundImage.src = "./assets/background.png";
const backgroundSpeed = time / 5;
const backgroundTileHeight = 600;
let backgroundOffset = 0;

const shelfImage = new Image();
shelfImage.src = "./assets/shelf.png";

const runSpritesRight = []; // array to store animation frames
// Load all run animation frames
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `./assets/hero${i}.png`; // Replace with your actual file names
  runSpritesRight.push(img);
}

const runSpritesLeft = []; // array to store animation frames
// Load all run animation frames
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `./assets/hero${i}left.png`; // Replace with your actual file names
  runSpritesLeft.push(img);
}

const jumpSpriteRight = new Image();
jumpSpriteRight.src = "./assets/herojump.png";

const jumpSpriteLeft = new Image();
jumpSpriteLeft.src = "./assets/herojumpleft.png";

let shelfTimer;

const startingPlatformImage = new Image();
startingPlatformImage.src = "./assets/floor.png";

// startingPlatformImage.onload = gameStart;

window.addEventListener("keydown", keyDownHandler);
window.addEventListener("keyup", keyUpHandler);
restartButton.addEventListener("click", restartGame);

gameStart();

function gameStart() {
  running = true;

  let shelvesTimer = 1200 * (time / 100) * 100;

  shelfTimer = setInterval(addShelf, shelvesTimer); // Add a new shelf every 1s

  if (!timeIntervalId) {
    timeIntervalId = setInterval(() => {
      time += 0.3;
    }, 5000);
  }

  draw();
}

function draw() {
  if (running) {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Draw background
    for (let i = 0; i <= Math.ceil(gameHeight / backgroundTileHeight); i++) {
      ctx.drawImage(
        backgroundImage,
        0,
        i * backgroundTileHeight - backgroundOffset,
        gameWidth,
        backgroundTileHeight
      );
    }

    ctx.font = "24px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(`Score: ${score}`, 50, 50);

    ctx.font = "24px Arial";
    ctx.fillStyle = "white";
    let jetpackDurationTime =
      jetpackDuration < 0 ? 0 : jetpackDuration.toFixed(1);
    ctx.fillText(`Jetpack: ${jetpackDurationTime}s`, 50, 100);

    // Draw shelves
    shelves.forEach((shelf) => {
      let numTiles = Math.ceil(shelf.width / unitSize); // Calculate number of tiles to draw
      for (let i = 0; i < numTiles; i++) {
        ctx.drawImage(
          shelfImage,
          shelf.x + i * unitSize,
          shelf.y,
          unitSize,
          unitSize
        );
      }
    });

    // Move shelves downwards
    if (gameStarted) moveShelves();

    // Draw starting platform if visible
    if (startingPlatform.visible) {
      // Calculate how many tiles fit horizontally and vertically
      const tilesHorizontally = Math.ceil(startingPlatform.width / unitSize);
      const tilesVertically = Math.ceil(startingPlatform.height / unitSize);

      // Draw the image tiles
      for (let i = 0; i < tilesHorizontally; i++) {
        for (let j = 0; j < tilesVertically; j++) {
          ctx.drawImage(
            startingPlatformImage,
            startingPlatform.x + i * unitSize,
            startingPlatform.y + j * unitSize,
            unitSize,
            unitSize
          );
        }
      }
    }

    if (jetpackInUse) drawFlames();

    // horizontal movement
    if (leftPressed) {
      heroSpeed -= acceleration;
    } else if (rightPressed) {
      heroSpeed += acceleration;
    } else {
      if (heroSpeed !== 0) {
        heroSpeed += heroSpeed > 0 ? -deceleration : deceleration;
        if (Math.abs(heroSpeed) < deceleration) heroSpeed = 0;
      }
    }

    // limit max speed
    if (Math.abs(heroSpeed) > maxSpeed) {
      heroSpeed = heroSpeed > 0 ? maxSpeed : -maxSpeed;
    }

    // update x position based on current speed
    hero.x += heroSpeed;

    // Handle wall bouncing
    if (hero.x <= 0) {
      hero.x = 0;
      heroSpeed = Math.abs(heroSpeed) + wallBounceBoost; // Bounce off left wall with boost
    }
    if (hero.x >= gameWidth - unitSize) {
      hero.x = gameWidth - unitSize;
      heroSpeed = -Math.abs(heroSpeed) - wallBounceBoost; // Bounce off right wall with boost
    }

    // vertical movement
    if (isJumping) {
      performJump();
    } else {
      fallDown();
    }

    // bounds check
    if (hero.x <= 0) hero.x = 0;
    if (hero.x >= gameWidth - unitSize) hero.x = gameWidth - unitSize;

    checkCollisions();
    drawHero();
    requestAnimationFrame(draw);
  }
}

function fallDown() {
  if (hero.y < gameHeight - unitSize - startingPlatform.height) {
    hero.y += gravity;
  }
  if (!startingPlatform.visible && hero.y < gameHeight - unitSize) {
    hero.y += gravity;
  }
  if (hero.y >= gameHeight - unitSize) gameOver();

  if (jetpackInUse) {
    useJetpack();
  }
}

function performJump() {
  if (jumpDistance < jumpHeight) {
    hero.y -= jumpSpeed;
    jumpDistance += jumpSpeed;
  } else {
    isJumping = false;
    jumpDistance = 0;
  }
}

function jump() {
  if ((!isJumping && hero.y === gameHeight - unitSize * 2) || isOnShelf()) {
    isJumping = true;
    jumpHeight = calculateJumpHeight();
  }
  console.log(time);
}

function calculateJumpHeight() {
  let timeCounter = time * 2;
  // calculate jump height based on hero speed
  return 100 + Math.abs(heroSpeed) * timeCounter;
}

function isOnShelf() {
  // Check if hero is currently on any shelf
  for (let shelf of shelves) {
    if (
      hero.x + unitSize >= shelf.x &&
      hero.x <= shelf.x + shelf.width &&
      hero.y + unitSize === shelf.y
    ) {
      return true;
    }
  }
  return false;
}

function addShelf() {
  if (gameStarted) {
    // Add a new shelf randomly at the top if the canvas
    let minShelfWidth = 150;
    let shelfWidth =
      Math.random() * (gameWidth / 2 - minShelfWidth) + minShelfWidth;
    let shelfHeight = 20;
    let shelfX = Math.random() * (gameWidth - shelfWidth);
    let shelfY = -shelfHeight; // Start above the canvas

    shelves.push({
      x: shelfX,
      y: shelfY,
      width: shelfWidth,
      height: shelfHeight,
      landed: false,
    });
  }
}

function moveShelves() {
  // Move shelves downwards
  shelves.forEach((shelf) => {
    shelf.y += time;

    // Remove shelf if it goes out of the visible canvas
    if (shelf.y > gameHeight) {
      shelves.splice(shelves.indexOf(shelf), 1);
    }

    // Move background downwards
    backgroundOffset += backgroundSpeed;
    if (backgroundOffset > backgroundTileHeight) {
      backgroundOffset -= backgroundTileHeight;
    }
  });

  // Remove starting platform if hero jumps onto the first shelf
  if (
    startingPlatform.visible &&
    shelves.length > 0 &&
    hero.y < gameHeight - unitSize
  ) {
    startingPlatform.y += 1; // Decrease height smoothly

    // Check if the starting platform height has decreased sufficiently
    if (startingPlatform.y > gameHeight) {
      startingPlatform.visible = false;
    }
  }
}

function keyDownHandler(e) {
  // left arrow
  if (e.keyCode === 37) {
    leftPressed = true;
    currentDirection = "LEFT";
    isStatic = false;
  }
  if (e.keyCode === 39) {
    // right arrow
    rightPressed = true;
    currentDirection = "RIGHT";
    isStatic = false;
  }
  if (e.keyCode === 32) {
    // space
    if (!isJumping) {
      gameStarted = true;
      jump();
    }
  }
  // "R" key
  if (e.keyCode === 82 && heroSpeed !== 0) {
    useJetpack();
  }
  if (e.keyCode === 82) {
    if (!running) {
      restartGame();
    }
  }
}

function keyUpHandler(e) {
  if (e.keyCode === 37) {
    leftPressed = false;
    isStatic = true;
  }
  if (e.keyCode === 39) {
    rightPressed = false;
    isStatic = true;
  }
  // "R" key
  if (e.keyCode === 82) {
    stopJetpack();
  }
}

function drawHero() {
  switch (currentDirection) {
    case "LEFT": {
      if (isJumping) {
        ctx.drawImage(jumpSpriteLeft, hero.x, hero.y, unitSize, unitSize);
      }
      if (isStatic) {
        ctx.drawImage(runSpritesLeft[0], hero.x, hero.y, unitSize, unitSize);
      } else {
        // Running animation
        const currentFrame =
          Math.floor(Date.now() / 100) % runSpritesLeft.length; // Adjust frame speed
        ctx.drawImage(
          runSpritesLeft[currentFrame],
          hero.x,
          hero.y,
          unitSize,
          unitSize
        );
      }
      break;
    }
    case "RIGHT": {
      if (isJumping) {
        ctx.drawImage(jumpSpriteRight, hero.x, hero.y, unitSize, unitSize);
      }
      if (isStatic) {
        ctx.drawImage(runSpritesRight[0], hero.x, hero.y, unitSize, unitSize);
      } else {
        // Running animation
        const currentFrame =
          Math.floor(Date.now() / 100) % runSpritesRight.length; // Adjust frame speed
        ctx.drawImage(
          runSpritesRight[currentFrame],
          hero.x,
          hero.y,
          unitSize,
          unitSize
        );
      }
      break;
    }
  }
}

function checkCollisions() {
  shelves.forEach((shelf) => {
    if (
      hero.y + unitSize >= shelf.y && // Hero's bottom below or touching shelf's top
      hero.y <= shelf.y + shelf.height && // Hero's top above or touching shelf's bottom
      hero.x + unitSize >= shelf.x && // Hero's right side to the right of shelf's left side
      hero.x <= shelf.x + shelf.width // Hero's left side to the left of shelf's right side
    ) {
      // Hero collided with this shelf
      if (!jetpackInUse) handleCollision(shelf);
    }
  });
}

function handleCollision(shelf) {
  // Check if hero landed on the shelf
  if (!isJumping && hero.y < shelf.y && hero.y + unitSize >= shelf.y) {
    if (!shelf.landed) {
      // Increase score based on multiplier
      score += Math.floor(
        scoreMultiplier + Math.abs(heroSpeed) + jumpDistance / 10
      );

      // Increase multiplier for next jump
      scoreMultiplier++;

      // Set landed flag for this shelf
      shelf.landed = true;
    }

    // Position hero on top of the shelf
    hero.y = shelf.y - unitSize;
    jumpDistance = 0;
  } else {
    // Reset multiplier and landed flag if hero did not land on the shelf
    scoreMultiplier = 1;
    shelf.landed = false;
  }
}

function gameOver() {
  running = false;

  ctx.font = "bold 60px Trebuchet MS";
  ctx.fillStyle = "white";
  const gameOverText = "Game Over!";
  ctx.fillText(
    gameOverText,
    gameWidth / 2 - ctx.measureText(gameOverText).width / 2,
    100
  );
  ctx.font = "60px Trebuchet MS";
  const scoreText = `Score: ${score}`;
  ctx.fillText(
    scoreText,
    gameWidth / 2 - ctx.measureText(scoreText).width / 2,
    gameHeight / 2
  );

  restartButton.classList.remove("hide");
}

function restartGame() {
  // Reset variables
  score = 0;
  scoreMultiplier = 1;
  hero = { x: gameWidth / 2 - unitSize / 2, y: gameHeight - unitSize * 2 };
  heroSpeed = 0;
  shelves = [
    {
      x: 0,
      y: 650,
      width: gameWidth,
      height: unitSize,
    },
    {
      x: 100,
      y: 500,
      width: 300,
      height: unitSize,
    },
    {
      x: 300,
      y: 350,
      width: 300,
      height: unitSize,
    },
    {
      x: 0,
      y: 200,
      width: 250,
      height: unitSize,
    },
    {
      x: 500,
      y: 100,
      width: 250,
      height: unitSize,
    },
    {
      x: 200,
      y: 0,
      width: 250,
      height: unitSize,
    },
  ];
  startingPlatform.x = 0;
  startingPlatform.y = gameHeight - unitSize;
  startingPlatform.width = gameWidth;
  startingPlatform.height = unitSize;
  startingPlatform.visible = true;

  gameStarted = false;
  time = 1;
  jetpackDuration = 5;
  jetpackInUse = false;

  clearInterval(shelfTimer);
  clearInterval(timeIntervalId);
  clearInterval(jetpackIntervalId);

  timeIntervalId = null;
  jetpackIntervalId = null;

  // Remove the restart button if it exists
  restartButton.classList.add("hide");

  // Restart the game
  gameStart();
}

function useJetpack() {
  if (jetpackDuration > 0 && gameStarted) {
    jetpackInUse = true;

    // Start interval to decrement jetpack duration
    if (!jetpackIntervalId) {
      jetpackIntervalId = setInterval(() => {
        jetpackDuration -= 0.1;
        if (jetpackDuration <= 0) {
          stopJetpack(); // Stop jetpack when duration runs out
        }
      }, 100);
    }

    // Move hero upwards while jetpack is active
    hero.y -= gravity + jetpackPower;
  }
}

function stopJetpack() {
  clearInterval(jetpackIntervalId);
  jetpackIntervalId = null;
  jetpackInUse = false;
}

function drawFlames() {
  // determine position

  const flameX = hero.x;
  const flameY = hero.y + unitSize;

  // run animation
  const currentFrame = Math.floor(Date.now() / 100) % flameSprites.length; // frame speed

  // draw

  ctx.drawImage(flameSprites[currentFrame], flameX, flameY, unitSize, unitSize);
}
