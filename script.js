'use strict';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.squareSize = 80; //px
    // this.activeWidth = this.canvas.width;
    // this.activeHeight = this.canvas.height - this.squareSize;

    //Game state
    this.score = 0;
    this.highScore = 0;
    this.gameOver = false;
    this.level = 0;
    this.levelCountdown = 300000; //200s;

    //Obstacles
    this.obstacles = [];
    this.numObstacles = 30;
    this.createObstacles();

    // Player
    this.player = new Player(this);

    //Enemies
    this.enemies = [];
    this.numEnemies = 1;
    this.maxEnemies = 5;

    // this.createEnemies()// - moved to renderEnemies function

    //Heart
    this.heart = new Heart(this);

    //Dodajemo tastere koji su pritisnuti odmah u constructoru
    this.movementKeys = [];
    this.rotationKeys = [];
    this.shootingKeys = [];
    this.lastMovementKey = '';

    //Projectili
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.numProjectiles = 10;
    this.createPlayerProjectiles();

    this.isFired = false;
    this.isFirstShotFired = false;
    this.isFirstMoveMade = false;

    //Assets
    //Visual
    this.asphaltImage = document.getElementById('asphalt-image');
    this.grassImage = document.getElementById('grass-image');
    this.wallImage = document.getElementById('wall-image');
    //Audio files

    // this.audioBackgroundSong = new Audio('Assets/Audio/TenkiciSoundtrack.mp3');
    this.audioBackgroundSong = new Howl({
      src: ['TenkiciSoundtrack.mp3'],
      volume: 0.7,
      loop: true,
      // autoplay: true,
    });

    // this.audioGameOver = new Audio('Assets/Audio/GameOver.mp3');
    this.audioGameOver = new Howl({
      src: ['GameOver.mp3'],
    });

    window.addEventListener('keydown', e => {
      //Player shooting
      if (this.shootingKeys.indexOf(e.key) === -1 && e.key === ' ') {
        this.shootingKeys.push(e.key);

        if (this.shootingKeys.length > 1) {
          this.shootingKeys.shift(); //tako da uvek ostaje poslenj pritisnut taster
        }
      }
      //Trigger Shot
      if (this.shootingKeys.indexOf(' ') > -1 && !this.isFired) {
        if (this.player.reloaded && !this.player.isDestroyed) {
          this.player.shoot();
          this.player.reloadTimer = 0;
        }
        this.isFired = true;
        this.isFirstShotFired = true;
      }

      //Player rotation
      if (
        this.rotationKeys.indexOf(e.key) === -1 &&
        e.key !== ' ' &&
        e.key !== this.lastMovementKey
      ) {
        this.rotationKeys.push(e.key); //ubacujemo taster koji nije pritisnut
        if (this.rotationKeys.length > 1) {
          this.rotationKeys.shift(); //tako da uvek ostaje poslenji pritisnut taster
        }
      }

      //Player movement
      if (this.player.readyToMove) {
        this.lastMovementKey = ''; //Kako bi mogao ici napred-nazad po X ili po Y osi
        if (this.movementKeys.indexOf(e.key) === -1 && e.key !== ' ')
          this.isFirstMoveMade = true;
        this.movementKeys.push(e.key); //ubacujemo taster koji nije pritisnut
        if (!this.audioBackgroundSong.playing()) {
          this.audioBackgroundSong.play();
        }

        if (this.movementKeys.length > 1) {
          this.movementKeys.shift();
        } //tako da uvek ostaje poslenji pritisnut taster
      }

      //Restart
      if (this.gameOver && e.key === 'r') {
        this.restart();
      }
    });

    window.addEventListener('keyup', e => {
      if (!this.player.additionalMovement) this.lastMovementKey = e.key; //Upamti koji je zadnji key za kretanje stisnut samo onda kada nema dodatnog kretanja

      const indexRotation = this.rotationKeys.indexOf(e.key);
      const indexMovement = this.movementKeys.indexOf(e.key);
      const indexShooting = this.shootingKeys.indexOf(e.key);
      if (indexRotation === indexMovement)
        this.rotationKeys.splice(indexRotation, 1); //brisemo taster ako je pritisnut
      if (indexMovement > -1) this.movementKeys.splice(indexMovement, 1); //brisemo taster ako je pritisnut
      if (indexShooting > -1) this.shootingKeys.splice(indexShooting, 1);
      this.isFired = false;
    });

    //Sprite animation menagment
    this.spriteUpdate = false;
    this.spriteTimer = 0; //ms
    this.spriteInterval = 200; //ms

    //Tank Blinking Indication menagment
    this.blinkingUpdate = false;
    this.blinkingTimer = 0; //ms
    this.blinkingInterval = 75; //ms

    //Key tap/press managment
    this.isKeyPressed = false;
    this.keyTimer = 0; //ms
    this.keyInterval = 100; //ms

    //Game start countdown
    this.isGameStarted = false;
    this.gameStartCountdownTimer = 5000; //5000 ms
    this.isCountingDown = false;
  }

  restart() {
    //Audio assets
    this.audioGameOver.stop();
    this.audioBackgroundSong.play();

    //Game start countdown
    this.isGameStarted = false;
    this.gameStartCountdownTimer = 5000; //5000 ms
    this.isCountingDown = false;

    //Game state
    this.gameOver = false;
    this.score = 0;
    this.level = 0;
    this.levelCountdown = 300000;
    this.numEnemies = 0;

    //Obstacles
    this.obstacles = [];
    this.numObstacles = 30;
    this.createObstacles();

    // Player
    this.player = new Player(this);

    //Enemies
    this.enemies = [];

    //Heart
    this.heart = new Heart(this);
    this.isFired = false;
    this.isFirstShotFired = false;

    return true;
  }

  createObstacles() {
    for (let i = 0; i < this.numObstacles; i++) {
      this.obstacles.push(new Obstacle(this));
    }
  }

  createEnemies() {
    for (let i = 0; i < this.numEnemies; i++) {
      this.enemies.push(new Enemy(this));
    }
  }

  createPlayerProjectiles() {
    for (let i = 0; i < this.numProjectiles; i++) {
      this.playerProjectiles.push(new PlayerProjectile(this));
    }
  }

  createEnemyProjectiles() {
    this.enemies.forEach(enemy => {
      for (let j = 0; j < this.numProjectiles; j++) {
        enemy.projectiles.push(new EnemyProjectile(this));

        enemy.projectiles.forEach(projectile => {
          projectile.enemy = enemy;
          projectile.directionX = enemy.directionX;
          projectile.directionY = enemy.directionY;
        });
      }
    });
  }

  getPlayerProjectile() {
    for (let i = 0; i < this.playerProjectiles.length; i++) {
      if (this.playerProjectiles[i].free) return this.playerProjectiles[i];
    }
  }

  //Helper functions:
  checkCollision(a, b) {
    return (
      a.positionX < b.positionX + b.width &&
      a.positionX + a.width > b.positionX &&
      a.positionY < b.positionY + b.height &&
      a.positionY + a.height > b.positionY
    );
  } //na ovaj nacin metod uvek vraca true ili false

  checkRectLeft(a, b) {
    return a.positionX === b.positionX + b.width && a.positionY === b.positionY;
  }

  checkRectRight(a, b) {
    return a.positionX + a.width === b.positionX && a.positionY === b.positionY;
  }

  checkRectUp(a, b) {
    return (
      a.positionX === b.positionX && a.positionY === b.positionY + b.height
    );
  }

  checkRectDown(a, b) {
    return (
      a.positionX === b.positionX && a.positionY + a.height === b.positionY
    );
  }

  checkRectLeftUp(a, b, c) {
    return (
      a.positionX === b.positionX + b.width &&
      a.positionY === b.positionY &&
      a.positionX === c.positionX &&
      a.positionY === c.positionY + c.height
    );
  }

  checkRectLeftRight(a, b, c) {
    return (
      a.positionX === b.positionX + b.width &&
      a.positionY === b.positionY &&
      a.positionX + a.width === c.positionX &&
      a.positionY === c.positionY
    );
  }

  checkRectLeftDown(a, b, c) {
    return (
      a.positionX === b.positionX + b.width &&
      a.positionY === b.positionY &&
      a.positionX === c.positionX &&
      a.positionY + a.height === c.positionY
    );
  }

  checkRectRightUp(a, b, c) {
    return (
      a.positionX + a.width === b.positionX &&
      a.positionY === b.positionY &&
      a.positionX === c.positionX &&
      a.positionY === c.positionY + c.height
    );
  }

  checkRectRightDown(a, b, c) {
    return (
      a.positionX + a.width === b.positionX &&
      a.positionY === b.positionY &&
      a.positionX === c.positionX &&
      a.positionY + a.height === c.positionY
    );
  }

  checkRectUpDown(a, b, c) {
    return (
      a.positionX === b.positionX &&
      a.positionY === b.positionY + b.height &&
      a.positionX === c.positionX &&
      a.positionY + a.height === c.positionY
    );
  }

  checkRectLeftRightUp(a, b, c, d) {
    return (
      a.positionX === b.positionX + b.width &&
      a.positionY === b.positionY &&
      a.positionX + a.width === c.positionX &&
      a.positionY === c.positionY &&
      a.positionX === d.positionX &&
      a.positionY === d.positionY + d.height
    );
  }

  checkRectLeftRightDown(a, b, c, d) {
    return (
      a.positionX === b.positionX + b.width &&
      a.positionY === b.positionY &&
      a.positionX + a.width === c.positionX &&
      a.positionY === c.positionY &&
      a.positionX === d.positionX &&
      a.positionY + a.height === d.positionY
    );
  }

  checkRectUpDownLeft(a, b, c, d) {
    return (
      a.positionX === b.positionX &&
      a.positionY === b.positionY + b.height &&
      a.positionX === c.positionX &&
      a.positionY + a.height === c.positionY &&
      a.positionX === d.positionX + d.width &&
      a.positionY === d.positionY
    );
  }
  checkRectUpDownRight(a, b, c, d) {
    return (
      a.positionX === b.positionX &&
      a.positionY === b.positionY + b.height &&
      a.positionX === c.positionX &&
      a.positionY + a.height === c.positionY &&
      a.positionX + a.width === d.positionX &&
      a.positionY === d.positionY
    );
  }

  checkOverlappingVertical(a, b) {
    return (
      a.positionX < b.positionX + b.width && a.positionX + a.width > b.positionX
    );
  }

  checkOverlappingHorzontal(a, b) {
    return (
      a.positionY < b.positionY + b.height &&
      a.positionY + a.height > b.positionY
    );
  }

  checkRectMiddleHorizontal(a, b, c) {
    //a-middle, b -right, c - left ||a-middle, b -left, c - right
    return (
      (a.positionX + a.width <= b.positionX &&
        this.checkOverlappingHorzontal(a, b) &&
        a.positionX >= c.positionX + c.width &&
        this.checkOverlappingHorzontal(a, c)) ||
      (a.positionX + a.width <= c.positionX &&
        this.checkOverlappingHorzontal(a, b) &&
        a.positionX >= b.positionX + b.width &&
        this.checkOverlappingHorzontal(a, c))
    );
  }

  checkRectMiddleVertical(a, b, c) {
    //a-middle, b - up, c - down||a-middle, b - down, c - up
    return (
      (this.checkOverlappingVertical(a, b) &&
        a.positionY >= b.positionY + b.height &&
        this.checkOverlappingVertical(a, c) &&
        a.positionY + a.height <= c.positionY) ||
      (this.checkOverlappingVertical(a, c) &&
        a.positionY >= c.positionY + c.height &&
        this.checkOverlappingVertical(a, b) &&
        a.positionY + a.height <= b.positionY)
    );
  }
  calculateDistance(a, b) {
    //a- moving
    //b fixed

    if (this.checkOverlappingVertical(a, b)) {
      //1. a above b:

      if (a.positionY + a.height < b.positionY) {
        return Math.abs(a.positionY + a.height - b.positionY);
      }
      //2. a below b:

      if (b.positionY + b.height < a.positionY) {
        return Math.abs(b.positionY + b.height - a.positionY);
      }
    } else if (this.checkOverlappingHorzontal(a, b)) {
      //3. a left of b
      if (a.positionX + a.width < b.positionX) {
        return Math.abs(a.positionX + a.width - b.positionX);
      }

      //4. a right of b
      if (b.positionX + b.width < a.positionX) {
        return Math.abs(b.positionX + b.width - a.positionX);
      }
    } else {
      return -1; //no overlapping
    }

    return 0; //collision
  }

  checkIsInGrid(a) {
    return a.positionX % a.width === 0 && a.positionY % a.height === 0;
  }

  //Render functions:
  drawGround(context) {
    //Grass
    for (let i = 0; i < this.width; i = i + 80) {
      for (let j = 80; j < this.height; j = j + 80) {
        context.drawImage(
          this.grassImage,
          4,
          4,
          1016,
          1016,
          i,
          j,
          this.squareSize,
          this.squareSize
        );
      }
    }

    // Asphalt;
    this.obstacles.forEach(obstacle => {
      context.drawImage(
        this.asphaltImage,
        4,
        4,
        1016,
        1016,
        obstacle.positionX - this.squareSize,
        obstacle.positionY - this.squareSize,
        this.squareSize * 3,
        this.squareSize * 3
      );
    });

    //Top row
    for (let i = 0; i < this.width; i = i + 80) {
      context.drawImage(
        this.wallImage,
        0,
        0,
        1024,
        1024,
        i,
        0,
        this.squareSize,
        this.squareSize
      );
    }
  }

  drawDestroyedObstacles(context) {
    this.obstacles.forEach(obstacle => {
      if (obstacle.isDestroyed) {
        obstacle.draw(context);
      }
    });
  }

  drawBars(context) {
    //Player
    if (!this.player.isDestroyed) {
      this.player.drawHealth(context);
      this.player.drawReloadBar(context);
      //Enemies
      this.enemies.forEach(enemy => {
        enemy.drawHealth(context);
        enemy.drawReloadBar(context);
      });
    }
  }

  drawUndestoryedObstacles(context) {
    this.obstacles.forEach(obstacle => {
      if (!obstacle.isDestroyed) {
        obstacle.draw(context);
        if (obstacle.showHealth) {
          obstacle.drawHealth(context);
        }
      }
      obstacle.drawExplosion(context);
    });
  }

  renderHeart(context, deltaTime) {
    //Heart time managment
    if (this.heart.timer > this.heart.interval) {
      this.heart.isVisible = true; //
    } else {
      this.heart.isVisible = false;
      this.heart.timer += deltaTime;
    }

    if (this.heart.isVisible && !this.player.isDestroyed) {
      this.heart.draw(context);
      this.heart.update();
    }
  }

  renderPlayer(context, deltaTime) {
    //Player
    this.player.update();

    this.player.checkEnemyCOllision();
    this.player.checkEnemyContact();
    this.player.checkObstacleContact(); //must be after checkEnemyContact()
    this.player.draw(context);

    //Player Projectiles
    this.playerProjectiles.forEach(projectile => {
      projectile.update();
      projectile.draw(context);
    });

    //Player reload time managment
    if (this.player.reloadTimer > this.player.reloadTime) {
      this.player.reloaded = true; //
      // this.player.reloadTimer = 0; //nije potrebno
    } else {
      this.player.reloaded = false;
      this.player.reloadTimer += deltaTime;
    }
  }

  renderEnemies(context, deltaTime) {
    //Enemies filtering
    this.enemies = this.enemies.filter(enemy => !enemy.markedForDelition); //Enemies arr sadrzi samo one neprijatelje koji nisu pogodjeni

    //Pushing new enemies & new level
    // Game start
    if (this.level === 0) {
      if (this.enemies.length === 0 && this.isCountingDown) {
        this.level++; //Sets level to 1
        this.levelCountdown = 300000;
        this.createEnemies();
        this.createEnemyProjectiles();
      }
    } else {
      if (this.enemies.length === 0) {
        if (this.numEnemies < this.maxEnemies) {
          this.numEnemies++;
        }
        //To prevent adding another level when restart
        if (this.isGameStarted) {
          this.level++;
          this.score += Math.trunc(this.levelCountdown / 1000); //Adds time bonus
          this.levelCountdown = 300000;
        }

        this.gameStartCountdownTimer = 5000;
        this.createEnemies();
        this.createEnemyProjectiles();
      }
    }

    //Rendering enemies
    this.enemies.forEach(enemy => {
      //Randomization time managment
      if (enemy.randomizeTimer > enemy.randomizeTime) {
        enemy.readyToRandomize = true;
        // enemy.randomizeTimer = 0; //
      } else {
        enemy.readyToRandomize = false;
        enemy.randomizeTimer += deltaTime;
      }

      //Reload time managment
      if (enemy.reloadTimer > enemy.reloadTime) {
        enemy.reloaded = true; //
        // enemy.reloadTimer = 0; //nije potrebno
      } else {
        enemy.reloaded = false;
        enemy.reloadTimer += deltaTime;
      }

      //Aim time managmanet
      if (enemy.aimTimer > enemy.aimTime) {
        enemy.aimed = true; //
        // enemy.aimTimer = 0; //nije potrebno
      } else {
        enemy.aimed = false;
        enemy.aimTimer += deltaTime;
      }
      if (!this.player.isDestroyed) {
        if (this.isGameStarted) {
          enemy.shootAtPlayer(); //Must be before update
        }
        enemy.update();
        enemy.checkObstacleContact();
      }

      if (this.isCountingDown) {
        if (!this.blinkingUpdate) {
          enemy.draw(context);
        }
      } else if (this.isGameStarted) {
        enemy.draw(context);
      }

      //Enemy projectiles
      enemy.projectiles.forEach(projectile => {
        projectile.update();
        projectile.draw(context);
      });

      //Randomisation
      if (enemy.readyToRandomize) {
        enemy.randomizeEnemyDirection();
      }
    });
  }

  renderGameText(context) {
    //Score&Level
    if (this.isGameStarted && !this.gameOver) {
      context.fillText('Score: ' + this.score, 20, 26);
      context.fillText('Level: ' + this.level, 1020, 26);
      context.fillText(
        'Bonus: ' + Math.trunc(this.levelCountdown / 1000),
        320,
        26
      );
    }

    //Instructions
    context.save();
    if (!this.isFirstMoveMade || !this.isFirstShotFired) {
      context.textAlign = 'center';
      context.font = '20px "Press Start 2P';
      context.fillText(
        'Tap/press Arrow Keys to rotate/move, press Space to shoot!',
        this.width * 0.5,
        this.height * 0.5
      );
    }

    if (this.isCountingDown) {
      context.textAlign = 'center';
      context.font = '40px "Press Start 2P';
      if (this.level === 1) {
        context.fillText(
          `Enemy attacks start in: ${Math.trunc(
            this.gameStartCountdownTimer / 1000
          )}`,
          this.width * 0.5,
          this.height * 0.5
        );
      } else {
        context.fillText(
          'Score: ' + this.score,
          this.width * 0.5,
          this.height * 0.5
        );

        context.fillText(
          `Next level starts in: ${Math.trunc(
            this.gameStartCountdownTimer / 1000
          )}`,
          this.width * 0.5,
          this.height * 0.5 + 40
        );
      }
    }
    context.restore();

    //Game Over Text
    if (this.gameOver) {
      context.save();
      context.textAlign = 'center';
      context.font = '60px "Press Start 2P';
      context.fillText('GAME OVER', this.width * 0.5, this.height * 0.5);
      context.font = '20px "Press Start 2P';
      context.fillText(
        'Press R to restart',
        this.width * 0.5,
        this.height * 0.5 + 30
      );
      context.font = '20px "Press Start 2P';
      context.fillText(
        'Score: ' + this.score,
        this.width * 0.5,
        this.height * 0.5 + 60
      );
      context.fillText(
        'High score: ' + this.highScore,
        this.width * 0.5,
        this.height * 0.5 + 80
      );
    }
    context.restore();
  }

  //GAME RENDER:
  render(context, deltaTime) {
    //Game/level start time managment
    if (this.isFirstMoveMade && this.isFirstShotFired) {
      this.gameStartCountdownTimer -= deltaTime;
      this.isCountingDown = true;
    }

    if (this.gameStartCountdownTimer < 1000) {
      this.isCountingDown = false;
      this.isGameStarted = true;
    } else {
      this.isGameStarted = false;
    }

    //Level timer
    if (this.levelCountdown > 0 && this.isGameStarted) {
      this.levelCountdown -= deltaTime;
    }

    //Sprite time managment
    if (this.spriteTimer > this.spriteInterval) {
      this.spriteUpdate = true;
      this.spriteTimer = 0; //odmah ce trigerovati else block u sledecem frejmu
    } else {
      this.spriteUpdate = false;
      this.spriteTimer += deltaTime;
    }

    //Tank blinking time managment
    if (this.blinkingTimer > this.blinkingInterval) {
      this.blinkingUpdate = true;
      this.blinkingTimer = 0; //odmah ce trigerovati else block u sledecem frejmu
    } else {
      this.blinkingUpdate = false;
      this.blinkingTimer += deltaTime;
    }

    //Key tap/press
    if (this.movementKeys.length > 0) {
      this.keyTimer += deltaTime;
    } else {
      this.keyTimer = 0;
    }

    if (this.keyTimer > this.keyInterval) {
      this.isKeyPressed = true; //
      // this.player.keyTimer = 0; //odmah ce trigerovati else block u sledecem frejmu
    } else {
      this.isKeyPressed = false;
      // this.player.keyTimer += deltaTime;
    }

    /*Kako korisiti time menagment
    1. postaviti properti klase koji ce biti trigerovan u jednom frejmu u kom update bude true
    2. taj true properti koristi za trigerovanje odredjenog metoda koji zelis da bude vremenski uslovljen
    3. kada taj metod obavi svoje napravi da on vrati properti na false
    4. ponovo cekamo da update obavi svoje i postavi properti na true 
    */

    this.drawGround(context);

    //Obstacles update
    this.obstacles.forEach(obstacle => {
      obstacle.update();
    });

    this.drawDestroyedObstacles(context);
    this.renderPlayer(context, deltaTime);

    this.renderEnemies(context, deltaTime);
    if (this.isGameStarted) {
      this.renderHeart(context, deltaTime);
    }
    this.drawUndestoryedObstacles(context);
    if (this.isGameStarted) {
      this.drawBars(context); //Health & Reload
    }
    this.renderGameText(context);
  }
}

class Obstacle {
  constructor(game) {
    this.game = game;
    this.width = 80; //px
    this.height = 80;

    this.health = 150;
    this.maxHealth = 150;
    this.isDestroyed = false;
    this.showHealth = false;

    this.positionX =
      Math.floor(Math.random() * (this.game.width / this.width)) * this.width;
    this.positionY =
      Math.floor(Math.random() * ((this.game.height - 80) / this.height)) *
        this.height +
      80; //Izbegavam gornji i donji red - shift za 80

    //Assets
    //Visual
    this.image = document.getElementById('obstacle-image');
    this.imageDestroyed = document.getElementById('destroyed-image');
    this.imageFrame = Math.floor(Math.random() * 5);

    this.imageExplosion = document.getElementById('explosion-image');
    this.imageExplosionFrame = 0;
    this.imageExplosionMaxFrames = 6;
    //Audio
    // this.buildingDestroyed = new Audio('Assets/Audio/BuildingDestroyed.wav');
    // this.buildingHit = new Audio('Assets/Audio/TankDestroyed.mp3');
    this.buildingDestroyed = new Howl({
      src: ['BuildingDestroyed.wav'],
    });
    this.buildingHit = new Howl({
      src: ['TankDestroyed.mp3'],
    });
  }

  drawHealth(context) {
    context.save();
    if (this.health > 0) {
      context.fillStyle = 'blue';

      context.strokeRect(this.positionX, this.positionY - 10, this.width, 15);

      context.fillRect(
        this.positionX,
        this.positionY - 10,
        Math.floor(this.health * (this.width / this.maxHealth)),
        15
      );
      context.restore();
    }
  }

  update() {
    //To avoid overlapping obstacles
    for (let i = 0; i < this.game.obstacles.length; i++) {
      for (let j = i + 1; j < this.game.obstacles.length; j++) {
        if (
          this.game.obstacles[i].positionX ===
            this.game.obstacles[j].positionX &&
          this.game.obstacles[i].positionY === this.game.obstacles[j].positionY
        ) {
          Math.random() < 0.5
            ? (this.game.obstacles[j].positionX =
                Math.floor(Math.random() * (this.game.width / this.width)) *
                this.width)
            : (this.game.obstacles[j].positionY =
                Math.floor(
                  Math.random() * ((this.game.height - 80) / this.height)
                ) *
                  this.height +
                80);
        }
      }
    }

    //Sort obstacles
    this.game.obstacles.sort(function (a, b) {
      return a.positionY - b.positionY;
    });

    //Cheking collision with Player Projectile
    this.game.playerProjectiles.forEach(projectile => {
      if (
        !this.isDestroyed &&
        !projectile.free &&
        this.game.checkCollision(projectile, this)
      ) {
        if (this.game.isGameStarted) {
          this.health -= 30;

          this.showHealth = true;
        }

        if (this.health >= 1) {
          this.buildingHit.play();
        }

        projectile.reset();
      }
    });

    //Cheking collision with Player Projectile
    this.game.enemies.forEach(enemy =>
      enemy.projectiles.forEach(projectile => {
        if (
          !this.isDestroyed &&
          !projectile.free &&
          this.game.checkCollision(projectile, this)
        ) {
          if (this.game.isGameStarted) {
            this.health -= 30;

            this.showHealth = true;
          }

          if (this.health >= 1) {
            this.buildingHit.play();
          }

          projectile.reset();
        }
      })
    );

    // this.buildingHit.addEventListener('ended', () => {
    //   this.showHealth = false;
    // });
    this.buildingHit.playing() && this.game.isGameStarted
      ? (this.showHealth = true)
      : (this.showHealth = false);

    //Handling explosion
    if (this.health < 1 && this.game.spriteUpdate) {
      this.isDestroyed = true;
      if (this.isDestroyed && !this.markedForDelition) {
        if (!this.buildingDestroyed.playing()) this.buildingDestroyed.play();
      }
      this.imageExplosionFrame++;
      if (this.imageExplosionFrame > this.imageExplosionMaxFrames) {
        this.markedForDelition = true;
      }
    }
  }

  draw(context) {
    if (!this.isDestroyed) {
      context.drawImage(
        this.image,
        this.imageFrame * 96,
        158,
        96,
        170,
        this.positionX,
        this.positionY - 60,
        this.width,
        this.height + 60
      );
    } else {
      context.drawImage(
        this.imageDestroyed,
        4,
        4,
        1016,
        1016,
        this.positionX,
        this.positionY,
        this.width,
        this.height
      );
    }
  }

  drawExplosion(context) {
    if (this.isDestroyed) {
      context.drawImage(
        this.imageExplosion,
        this.imageExplosionFrame * 200,
        0,
        200,
        200,
        this.positionX - this.width,
        this.positionY - this.height,
        this.width * 3,
        this.height * 3
      );
    }
  }
}

class Tank {
  constructor(game) {
    this.game = game;

    this.width = 80; //px
    this.height = 80;

    this.speed = 2;
    this.health = 100;

    this.audioProjectileLaunch = new Howl({
      src: ['ProjectileLaunch.wav'],
    });
    this.audioTankDestroyed = new Howl({
      src: ['TankDestroyed.mp3'],
    });
    this.audioTankHit = new Howl({
      src: ['TankHit.wav'],
      volume: 0.15,
    });
  }

  drawHealth(context) {
    context.save();
    if (this.health > 0) {
      if (this.health >= 75) {
        context.fillStyle = 'green';
      } else if (this.health >= 50 && this.health < 75) {
        context.fillStyle = 'yellow';
      } else if (this.health >= 25 && this.health < 50) {
        context.fillStyle = 'orange';
      } else {
        context.fillStyle = 'red';
      }

      context.strokeRect(this.positionX, this.positionY - 10, this.width, 10);

      context.fillRect(
        this.positionX,
        this.positionY - 10,
        Math.floor(this.health * (this.width / this.maxHealth)),
        10
      );
      context.restore();
    }
  }

  drawReloadBar(context) {
    if (!this.isDestroyed) {
      context.save();
      context.fillStyle = 'purple';
      if (this.reloadTimer < this.reloadTime) {
        context.strokeRect(this.positionX, this.positionY, this.width, 10);
        context.fillRect(
          this.positionX,
          this.positionY,
          Math.floor(this.reloadTimer * (this.width / this.reloadTime)),
          10
        );
      }
      context.restore();
    }
  }

  checkIsOnCanvas() {
    return this.positionX < -this.width ||
      this.positionY < 0 ||
      this.positionX > this.game.width ||
      this.positionY > this.game.height
      ? false
      : true;
  }
}

class Player extends Tank {
  constructor(game) {
    super(game);

    //Random pozicije
    this.positionX =
      Math.floor(Math.random() * (this.game.width / this.width)) * this.width;
    this.positionY =
      (Math.floor(Math.random() * (this.game.height / this.height - 1)) + 1) *
      this.height;

    this.directionX = 1;
    this.directionY = 0;

    this.speed = 2;
    this.readyToMove = true;
    this.additionalMovement = false;

    this.canMoveRight = true;
    this.canMoveLeft = true;
    this.canMoveUp = true;
    this.canMoveDown = true;
    this.isRotated = false;

    //Health
    this.health = 100;
    this.maxHealth = 100;
    this.isDestroyed = false;

    //Reload
    this.reloadTime = 4000; //ms
    this.reloaded = true;
    this.reloadTimer = 4001; //ms

    //Assets Visual
    this.image = document.getElementById('player-image');
    this.imageFrame = 0;
    this.imageExplosion = document.getElementById('explosion-image');
    this.imageExplosionFrame = 0;
    this.imageExplosionMaxFrames = 6;
    //Asseets Audio
    this.audioEngineSound = new Howl({ src: ['Tank.mp3'], volume: 0.15 });
  }

  draw(context) {
    if (!this.isDestroyed) {
      if (this.imageFrame === 0 || this.imageFrame === 1) {
        context.drawImage(
          this.image,
          1024 * this.imageFrame + 40,
          196,
          1024,
          1024,
          this.positionX,
          this.positionY - 10,
          this.width + 5,
          this.height + 40
        );
      }

      if (this.imageFrame === 2 || this.imageFrame === 3) {
        context.drawImage(
          this.image,
          1024 * this.imageFrame + 40,
          196,
          1024,
          1024,
          this.positionX - 15,
          this.positionY,
          this.width + 40,
          this.height + 30
        );
      }
    } else {
      context.drawImage(
        this.imageExplosion,
        this.imageExplosionFrame * 200,
        0,
        200,
        200,
        this.positionX - 15,
        this.positionY - 15,
        this.width + 30,
        this.height + 30
      );
    }
  }

  deploy() {
    //Avoid obstacles
    this.game.obstacles.forEach(obstacle => {
      //To avoid overlapping with obstacles
      if (
        !obstacle.isDestroyed &&
        this.positionX === obstacle.positionX &&
        this.positionY === obstacle.positionY
      ) {
        Math.random() < 0.5
          ? (this.positionX =
              Math.floor(Math.random() * (this.game.width / this.width)) *
              this.width)
          : (this.positionY =
              (Math.floor(
                Math.random() * (this.game.height / this.height - 1)
              ) +
                1) *
              this.height);
      }
    });

    //Guard clause - if not in canvas
    if (!this.checkIsOnCanvas()) {
      Math.random() < 0.5
        ? (this.positionX =
            Math.floor(Math.random() * (this.game.width / this.width)) *
            this.width)
        : (this.positionY =
            (Math.floor(Math.random() * (this.game.height / this.height - 1)) +
              1) *
            this.height);
    }
  }

  update() {
    this.deploy(); //To avoid obstacles

    if (this.game.checkIsInGrid(this)) {
      this.readyToMove = true;
      this.additionalMovement = false;
    } else {
      this.readyToMove = false;
    }

    //Sound
    if (!this.isDestroyed) {
      if (
        this.game.movementKeys.indexOf('ArrowLeft') > -1 ||
        this.game.movementKeys.indexOf('ArrowRight') > -1 ||
        this.game.movementKeys.indexOf('ArrowUp') > -1 ||
        this.game.movementKeys.indexOf('ArrowDown') > -1 ||
        this.additionalMovement
      ) {
        if (!this.audioEngineSound.playing()) {
          this.audioEngineSound.stop();
          this.audioEngineSound.play();
        }
      } else {
        this.audioEngineSound.stop();
      }
    }

    //Rotate
    if (
      !this.game.gameOver &&
      !this.isDestroyed &&
      this.game.checkIsInGrid(this)
    ) {
      if (
        this.game.movementKeys.indexOf('ArrowLeft') > -1 &&
        this.positionX >= 0
      ) {
        this.directionX = -1;
        this.directionY = 0;
        this.imageFrame = 1;
      }

      if (
        this.game.movementKeys.indexOf('ArrowRight') > -1 &&
        this.positionX <= this.game.width - this.width
      ) {
        // this.keyTimer=0;

        this.directionX = 1;
        this.directionY = 0;
        this.imageFrame = 0;
      }

      if (
        this.game.movementKeys.indexOf('ArrowUp') > -1 &&
        this.positionY >= 0 + this.game.squareSize
      ) {
        this.directionX = 0;
        this.directionY = -1;
        this.imageFrame = 3;
      }

      if (
        this.game.movementKeys.indexOf('ArrowDown') > -1 &&
        this.positionY <= this.game.height - this.height
      ) {
        this.directionX = 0;
        this.directionY = 1;
        this.imageFrame = 2;
      }
    }

    //Move
    if (!this.game.gameOver && !this.isDestroyed) {
      if (
        this.game.movementKeys.indexOf('ArrowLeft') > -1 &&
        this.positionX > 0 &&
        this.canMoveLeft &&
        this.game.isKeyPressed
      ) {
        this.positionX -= this.speed;
      } else if (
        this.game.lastMovementKey === 'ArrowLeft' &&
        this.positionX % this.width !== 0
      ) {
        this.additionalMovement = true;
        this.positionX -= this.speed;
      }

      if (
        this.game.movementKeys.indexOf('ArrowRight') > -1 &&
        this.positionX < this.game.width - this.width &&
        this.canMoveRight &&
        this.game.isKeyPressed
      ) {
        this.isRotated = true;
        this.positionX += this.speed;
      } else if (
        this.game.lastMovementKey === 'ArrowRight' &&
        this.positionX % this.width !== 0
      ) {
        this.additionalMovement = true;
        this.positionX += this.speed;
      }

      if (
        this.game.movementKeys.indexOf('ArrowUp') > -1 &&
        this.positionY > 0 + this.game.squareSize &&
        this.canMoveUp &&
        this.game.isKeyPressed
      ) {
        this.positionY -= this.speed;
      } else if (
        this.game.lastMovementKey === 'ArrowUp' &&
        this.positionY % this.height !== 0
      ) {
        this.additionalMovement = true;
        this.positionY -= this.speed;
      }

      if (
        this.game.movementKeys.indexOf('ArrowDown') > -1 &&
        this.positionY < this.game.height - this.height &&
        this.canMoveDown &&
        this.game.isKeyPressed
      ) {
        this.positionY += this.speed;
      } else if (
        this.game.lastMovementKey === 'ArrowDown' &&
        this.positionY % this.height !== 0
      ) {
        this.additionalMovement = true;
        this.positionY += this.speed;
      }
    }

    if (this.game.player.health < 1 && this.game.spriteUpdate) {
      this.isDestroyed = true;
      if (this.isDestroyed && !this.game.gameOver) {
        if (!this.audioTankDestroyed.playing()) this.audioTankDestroyed.play();
      }
      this.game.gameOver = true;
      this.game.audioBackgroundSong.stop();

      if (!this.game.audioGameOver.playing()) this.game.audioGameOver.play();
      this.game.score > this.game.highScore
        ? (this.game.highScore = this.game.score)
        : this.game.highScore;

      this.imageExplosionFrame++;
    }
  }

  shoot() {
    const projectile = this.game.getPlayerProjectile();
    projectile.start(this.positionX, this.positionY);
    this.audioProjectileLaunch.play();
  }

  checkObstacleContact() {
    this.game.obstacles.forEach(obstacle => {
      if (!obstacle.isDestroyed) {
        //LEFT
        if (this.game.checkRectLeft(this, obstacle)) {
          this.canMoveLeft = false;
        }
        //UP
        if (this.game.checkRectUp(this, obstacle)) {
          this.canMoveUp = false;
        }
        //RIGHT
        if (this.game.checkRectRight(this, obstacle)) {
          this.canMoveRight = false;
        }
        //DOWN
        if (this.game.checkRectDown(this, obstacle)) {
          this.canMoveDown = false;
        }
      }
    });
  }

  checkEnemyContact() {
    this.canMoveLeft = true;
    this.canMoveUp = true;
    this.canMoveRight = true;
    this.canMoveDown = true;
    this.game.enemies.forEach(enemy => {
      if (!enemy.isDestroyed) {
        if (
          // /*  this.game.checkIsInGrid(this) &&*/
          this.game.calculateDistance(this, enemy) === 0
        ) {
          if (enemy.positionX + enemy.width === this.positionX) {
            this.canMoveLeft = false;
          }
          if (enemy.positionX === this.positionX + this.width) {
            this.canMoveRight = false;
          }
          if (enemy.positionY + enemy.height === this.positionY) {
            this.canMoveUp = false;
          }
          if (enemy.positionY === this.positionY + this.height) {
            this.canMoveDown = false;
          }
        }
      }
    });
  }

  checkEnemyCOllision() {
    this.game.enemies.forEach(enemy => {
      if (this.game.checkCollision(this, enemy) && !enemy.isDestroyed) {
        if (this.directionX === 1) {
          this.positionX -= 5;
        }

        if (this.directionX === -1) {
          this.positionX += 5;
        }

        if (this.directionY === 1) {
          this.positionY -= 5;
        }

        if (this.directionY === -1) {
          this.positionY += 5;
        }
      }
    });
  }
}
class Enemy extends Tank {
  constructor(game) {
    super(game);

    // Random pozicije
    this.positionX =
      Math.floor(Math.random() * (this.game.width / this.width)) * this.width;
    this.positionY =
      (Math.floor(Math.random() * (this.game.height / this.height - 1)) + 1) *
      this.height;
    this.speed = 2;

    this.canMoveRight = true;
    this.canMoveLeft = true;
    this.canMoveUp = true;
    this.canMoveDown = true;
    this.isTrapped = false;

    this.readyToRandomize = true;
    this.randomizeTimer = 0;
    this.randomizeTime = 8000; //ms;
    this.randomizeEnemyDirection(); //zadaje directionX i directionY na pocetku

    this.isDestroyed = false;
    this.markedForDelition = false;

    //Assets visual
    this.image = document.getElementById('enemy-image');
    this.imageExplosion = document.getElementById('explosion-image');
    this.imageFrame;
    this.imageExplosionFrame = 0;
    this.imageExplosionMaxFrames = 6;

    // this.escapeDistance = 80;
    this.collisionCount = 0;

    //Health
    this.health = 100;
    this.maxHealth = 100;

    this.projectiles = [];
    this.isPlayerVisible = true;

    //Reload
    this.reloadTime = 2000; //ms
    this.reloaded = true;
    this.reloadTimer = 2001; //ms

    //Aim
    this.aimTime = 1000; //ms
    this.aimed = false;
    this.aimTimer = 0;
  }

  randomizeEnemyDirection() {
    if (this.game.checkIsInGrid(this)) {
      this.directionX = Math.random() < 0.5 ? 1 : -1;
      this.directionY = Math.random() < 0.5 ? 1 : -1;

      Math.random() < 0.5 ? (this.directionX = 0) : (this.directionY = 0);

      this.randomizeTimer = 0;
      this.collisionCount = 0;
    }
  }

  invertEnemyDirection() {
    this.directionX *= -1;
    this.directionY *= -1;
  }

  draw(context) {
    if (!this.isDestroyed) {
      if (this.imageFrame === 0 || this.imageFrame === 1) {
        context.drawImage(
          this.image,
          1024 * this.imageFrame + 40,
          196,
          1024,
          1024,
          this.positionX,
          this.positionY - 10,
          this.width + 5,
          this.height + 40
        );
      }

      if (this.imageFrame === 2 || this.imageFrame === 3) {
        context.drawImage(
          this.image,
          1024 * this.imageFrame + 40,
          196,
          1024,
          1024,
          this.positionX - 15,
          this.positionY,
          this.width + 40,
          this.height + 30
        );
      }
    } else {
      context.drawImage(
        this.imageExplosion,
        this.imageExplosionFrame * 200,
        0,
        200,
        200,
        this.positionX - 15,
        this.positionY - 15,
        this.width + 30,
        this.height + 30
      );
    }
  }

  getEnemyProjectile() {
    for (let i = 0; i < this.projectiles.length; i++) {
      if (this.projectiles[i].free) return this.projectiles[i];
    }
  }

  shoot() {
    const projectile = this.getEnemyProjectile();
    if (projectile) {
      projectile.start();
      this.audioProjectileLaunch.play();
    }
  }

  // escape() {
  //   if (
  //     this.game.checkIsInGrid(this) &&
  //     this.game.calculateDistance(this, this.game.player) < 80 &&
  //     this.game.calculateDistance(this, this.game.player) >= 0
  //   ) {
  //     if (
  //       this.game.checkOverlappingHorzontal(this, this.game.player) &&
  //       this.directionY === 0 &&
  //       this.game.player.directionX === this.directionX * -1
  //     ) {
  //       Math.random() < 0.5 ? (this.directionX *= -1) : (this.directionX = 0);
  //       if (this.directionX === 0) {
  //         Math.random() < 0.5 ? (this.directionY = -1) : (this.directionY = 1);
  //         this.speed = 2;
  //       }
  //     } else if (
  //       this.game.checkOverlappingVertical(this, this.game.player) &&
  //       this.directionX === 0 &&
  //       this.game.player.directionY === this.directionY * -1
  //     ) {
  //       Math.random() < 0.5 ? (this.directionY *= -1) : (this.directionY = 0);
  //       if (this.directionY === 0) {
  //         Math.random() < 0.5 ? (this.directionX = -1) : (this.directionX = 1);

  //         this.speed = 2;
  //       }
  //     }
  //   }
  // }

  //returning obstacle between player and enemy

  getMiddleObstacle() {
    for (let i = 0; i < this.game.obstacles.length; i++) {
      if (
        !this.game.obstacles[i].isDestroyed &&
        this.game.checkRectMiddleHorizontal(
          this.game.obstacles[i],
          this,
          this.game.player
        )
      ) {
        return this.game.obstacles[i];
      }
      if (
        !this.game.obstacles[i].isDestroyed &&
        this.game.checkRectMiddleVertical(
          this.game.obstacles[i],
          this,
          this.game.player
        )
      ) {
        return this.game.obstacles[i];
      }
    }
  }

  getMiddleEnemy() {
    for (let i = 0; i < this.game.enemies.length; i++) {
      if (
        this !== this.game.enemies[i] &&
        this.game.checkRectMiddleHorizontal(
          this.game.enemies[i],
          this,
          this.game.player
        )
      ) {
        return this.game.enemies[i];
      }
      if (
        this !== this.game.enemies[i] &&
        this.game.checkRectMiddleVertical(
          this.game.enemies[i],
          this,
          this.game.player
        )
      ) {
        return this.game.enemies[i];
      }
    }
  }

  deploy() {
    //Avoid player
    if (
      !this.isDestroyed &&
      this.positionX === this.game.player.positionX &&
      this.positionY === this.game.player.positionY
    ) {
      Math.random() < 0.5
        ? (this.positionX =
            Math.floor(Math.random() * (this.game.width / this.width)) *
            this.width)
        : (this.positionY =
            (Math.floor(Math.random() * (this.game.height / this.height - 1)) +
              1) *
            this.height);
    }

    //Avoid obstacles
    this.game.obstacles.forEach(obstacle => {
      //To avoid overlapping with obstacles
      if (
        !obstacle.isDestroyed &&
        this.positionX === obstacle.positionX &&
        this.positionY === obstacle.positionY
      ) {
        Math.random() < 0.5
          ? (this.positionX =
              Math.floor(Math.random() * (this.game.width / this.width)) *
              this.width)
          : (this.positionY =
              (Math.floor(
                Math.random() * (this.game.height / this.height - 1)
              ) +
                1) *
              this.height);
      }
    });
    //To avoid overlapping with other enemies
    this.game.enemies.forEach(enemy => {
      if (
        this.positionX === enemy.positionX &&
        this.positionY === enemy.positionY &&
        this !== enemy
      ) {
        Math.random() < 0.5
          ? (this.positionX =
              Math.floor(Math.random() * (this.game.width / this.width)) *
              this.width)
          : (this.positionY =
              (Math.floor(
                Math.random() * (this.game.height / this.height - 1)
              ) +
                1) *
              this.height);
      }
    });

    //Guard clause - if not in canvas
    if (!this.checkIsOnCanvas() && this.game.isGameStarted) {
      Math.random() < 0.5
        ? (this.positionX =
            Math.floor(Math.random() * (this.game.width / this.width)) *
            this.width)
        : (this.positionY =
            (Math.floor(Math.random() * (this.game.height / this.height - 1)) +
              1) *
            this.height);
    }
  }

  shootAtPlayer() {
    this.speed = 2;

    // Overlapping horizontaly
    if (!this.isDestroyed) {
      if (
        !this.getMiddleEnemy() &&
        this.isPlayerVisible &&
        this.game.checkOverlappingHorzontal(this, this.game.player) &&
        this.game.calculateDistance(this, this.game.player) >= 0 &&
        this.game.checkIsInGrid(this)
      ) {
        //Enemy to the left
        if (
          this.positionX < this.game.player.positionX &&
          this.directionX !== -1
        ) {
          this.directionX = 1;
          this.directionY = 0;
          this.randomizeTimer = 0; //to prevent randomization

          //Stop and shoot
          if (this.game.calculateDistance(this, this.game.player) <= 80) {
            this.speed = 0;
          }

          if (this.reloaded && this.aimed) {
            this.shoot();
            this.reloadTimer = 0;
          }
        }
        //Enemy to the Right
        else if (
          this.positionX > this.game.player.positionX &&
          this.directionX !== 1
        ) {
          this.directionX = -1;
          this.directionY = 0;
          this.randomizeTimer = 0; //to prevent randomization

          if (this.game.calculateDistance(this, this.game.player) <= 80) {
            this.speed = 0;
          }

          if (this.reloaded && this.aimed) {
            this.shoot();
            this.reloadTimer = 0;
          }
        }
      }

      //Overlapping vertically
      else if (
        !this.getMiddleEnemy() &&
        this.isPlayerVisible &&
        this.game.checkOverlappingVertical(this, this.game.player) &&
        this.game.calculateDistance(this, this.game.player) >= 0 &&
        this.game.checkIsInGrid(this)
      ) {
        //Enemy Up
        if (
          this.positionY < this.game.player.positionY &&
          this.directionY !== -1
        ) {
          this.directionY = 1;
          this.directionX = 0;
          this.randomizeTimer = 0; //to prevent randomization
          if (this.game.calculateDistance(this, this.game.player) <= 80) {
            this.speed = 0;
          }

          if (this.reloaded && this.aimed) {
            this.shoot();
            this.reloadTimer = 0;
          }
        }
        //Enemy Down
        else if (
          this.positionY > this.game.player.positionY &&
          this.directionY !== 1
        ) {
          this.directionY = -1;
          this.directionX = 0;
          this.randomizeTimer = 0; //to prevent randomization

          if (this.game.calculateDistance(this, this.game.player) <= 80) {
            this.speed = 0;
          }

          if (this.reloaded && this.aimed) {
            this.shoot();
            this.reloadTimer = 0;
          }
        }
      } else if (
        //Ako nema poklapanja vrati aimTimer na 0
        !this.game.checkOverlappingHorzontal(this, this.game.player) &&
        !this.game.checkOverlappingVertical(this, this.game.player)
      ) {
        this.aimTimer = 0;
      }
    }
  }

  checkObstacleContact() {
    this.canMoveRight = true;
    this.canMoveLeft = true;
    this.canMoveUp = true;
    this.canMoveDown = true;
    this.isTrapped = false;
    this.game.obstacles.forEach(obstacle => {
      if (!obstacle.isDestroyed) {
        //LEFT
        if (this.game.checkRectLeft(this, obstacle)) {
          this.canMoveLeft = false;
        }

        //UP
        if (this.game.checkRectUp(this, obstacle)) {
          this.canMoveUp = false;
        }

        //RIGHT
        if (this.game.checkRectRight(this, obstacle)) {
          this.canMoveRight = false;
        }

        //DOWN
        if (this.game.checkRectDown(this, obstacle)) {
          this.canMoveDown = false;
        }
      }
    });

    //Borders
    if (this.positionX === 0) {
      this.canMoveLeft = false;
    }
    if (this.positionY === 80) {
      this.canMoveUp = false;
    }
    if (this.positionX === this.game.width - this.width) {
      this.canMoveRight = false;
    }
    if (this.positionY === this.game.height - this.height) {
      this.canMoveDown = false;
    }
  }

  update() {
    //Checking if trapped
    if (
      !this.canMoveRight &&
      !this.canMoveLeft &&
      !this.canMoveUp &&
      !this.canMoveDown
    ) {
      this.isTrapped = true;
      this.speed = 0;
      // this.directionX = 1;
      // this.directionY = 0;
      // // this.randomizeTimer = 0;
      if (this.reloaded && this.game.isGameStarted) {
        this.shoot();
        this.reloadTimer = 0;
      }
    }

    this.deploy();
    // Checking if obstacle is between enemy and player
    const middleObstacle = this.getMiddleObstacle();
    if (middleObstacle) {
      this.isPlayerVisible = false;
    } else {
      this.isPlayerVisible = true;
    }

    // if (!middleObstacle) {
    //   // this.escape();
    // }

    if (this.collisionCount === 3) {
      this.randomizeEnemyDirection();
    }

    //Handling image
    if (this.directionX === 1) this.imageFrame = 0;
    if (this.directionX === -1) this.imageFrame = 1;
    if (this.directionY === 1) this.imageFrame = 2;
    if (this.directionY === -1) this.imageFrame = 3;

    //Basic movememt
    if (!this.isDestroyed) {
      this.positionX += this.speed * this.directionX;
      this.positionY += this.speed * this.directionY;
    }

    //Bounce of canvas edges
    if (!this.isTrapped) {
      //   if (this.positionX <= 0 && this.directionX === -1) {
      //     this.collisionCount++;
      //     this.directionX *= -1;
      //     this.directionY = 0;
      //   }

      //   if (
      //     this.positionX >= this.game.width - this.width &&
      //     this.directionX === 1
      //   ) {
      //     this.collisionCount++;
      //     this.directionX *= -1;
      //     this.directionY = 0;
      //   }

      //   if (this.positionY <= 80 && this.directionY === -1) {
      //     this.collisionCount++;
      //     this.directionY *= -1;
      //     this.directionX = 0;
      //   }

      //   if (
      //     this.positionY >= this.game.height - this.height &&
      //     this.directionY === 1
      //   ) {
      //     this.collisionCount++;
      //     this.directionY *= -1;
      //     this.directionX = 0;
      //   }

      if (this.positionX < 0 || this.positionX > this.game.width - this.width) {
        this.collisionCount++;
        this.directionX *= -1;
        this.directionY = 0;
      }
      if (
        this.positionY < 0 + this.game.squareSize ||
        this.positionY > this.game.height - this.height
      ) {
        this.collisionCount++;
        this.directionY *= -1;
        this.directionX = 0;
      }
    }

    //Checking collision with obstacles
    if (!this.isTrapped) {
      this.game.obstacles.forEach(obstacle => {
        if (!obstacle.isDestroyed) {
          if (this.game.checkCollision(this, obstacle)) {
            this.invertEnemyDirection();
            //Compensation
            if (this.directionX === -1) this.positionX -= this.speed;
            if (this.directionX === 1) this.positionX += this.speed;
            if (this.directionY === -1) this.positionY -= this.speed;
            if (this.directionY === 1) this.positionY += this.speed;
            this.collisionCount++;
          }
        }
      });
    }

    //Checking collision with player
    if (!this.game.player.isDestroyed) {
      if (this.game.checkCollision(this, this.game.player)) {
        this.invertEnemyDirection();

        //Compensation

        if (this.directionX === -1) this.positionX -= this.speed;
        if (this.directionX === 1) this.positionX += this.speed;
        if (this.directionY === -1) this.positionY -= this.speed;
        if (this.directionY === 1) this.positionY += this.speed;
        this.collisionCount++;
      }
    }

    this.game.enemies.forEach(enemy => {
      //Checking collision with other enemies
      if (enemy !== this && this.game.checkCollision(this, enemy)) {
        this.invertEnemyDirection();
        this.collisionCount++;
        if (this.directionX === -1) this.positionX -= this.speed;
        if (this.directionX === 1) this.positionX += this.speed;
        if (this.directionY === -1) this.positionY -= this.speed;
        if (this.directionY === 1) this.positionY += this.speed;
      }
    });

    //Cheking collision with Player Projectile
    this.game.playerProjectiles.forEach(projectile => {
      if (!projectile.free && this.game.checkCollision(projectile, this)) {
        if (this.game.isGameStarted) {
          this.health -= 30;
        }
        if (this.health >= 1) {
          this.audioTankHit.play();
        }

        projectile.reset();
        if (this.health < 1) {
          this.game.score += this.maxHealth;
        }
      }
    });

    if (this.health < 1) {
      this.speed = 0;
    }

    //Handling explosion
    if (this.health < 1 && this.game.spriteUpdate) {
      this.isDestroyed = true;
      if (this.isDestroyed && !this.markedForDelition) {
        if (!this.audioTankDestroyed.playing()) this.audioTankDestroyed.play();
      }
      this.imageExplosionFrame++;
      if (this.imageExplosionFrame > this.imageExplosionMaxFrames)
        this.markedForDelition = true;
    }

    //Cheking Player`s collision with Enemy Projectile
    this.projectiles.forEach(projectile => {
      if (
        !projectile.free &&
        this.game.checkCollision(projectile, this.game.player)
      ) {
        // this.markedForDelition = true;
        this.game.player.health -= 10;
        if (this.game.player.health >= 1) {
          this.audioTankHit.play();
        }
        projectile.reset();
      }
    });
  }
}

class Projectile {
  constructor(game) {
    this.game = game;
    this.width = 10; //px
    this.height = 10;

    this.speed = 10;
    this.free = true;

    //Assets visual
    this.image = document.getElementById('projectile-image');
  }

  isOnCanvas() {
    return this.positionX < 0 ||
      this.positionY < 80 ||
      this.positionX > this.game.width - this.width ||
      this.positionY > this.game.height - this.height
      ? false
      : true;
  }
}

class PlayerProjectile extends Projectile {
  constructor(game) {
    super(game);
    this.positionX = 0;
    this.positionY = 0;
    this.free = true;
  }

  update() {
    //Dok je u pool-u aziraj mu direkcije
    if (this.free) {
      this.directionX = this.game.player.directionX;
      this.directionY = this.game.player.directionY;
    }
    if (!this.isOnCanvas() /* && !this.game.player.additionalMovement*/) {
      //Menjaj direkciju
      //1. menjaj direkciju samo kada vise nije na canvasu
      this.directionX = this.game.player.directionX;
      this.directionY = this.game.player.directionY;
      //2. resetuj kada nije na canvasu
      this.reset();
    }

    if (!this.free) {
      if (this.directionX === 1) {
        this.positionX += this.speed;
      } else if (this.directionX === -1) {
        this.positionX -= this.speed;
      } else if (this.directionY === 1) {
        this.positionY += this.speed;
      } else if (this.directionY === -1) {
        this.positionY -= this.speed;
      } else {
        return;
      }
    }
  }
  draw(context) {
    if (!this.free) {
      // context.fillRect(this.positionX, this.positionY, this.width, this.height);

      context.drawImage(
        this.image,
        0,
        0,
        1024,
        1024,
        this.positionX - this.width * 0.5 + 5,
        this.positionY - this.height * 0.5 - 12,
        10,
        10
      );
    }
  }
  start(playerX, playerY) {
    //koordinate ignca
    if (this.directionX === 1) {
      this.positionX = playerX + this.game.player.width;
      this.positionY =
        playerY + this.game.player.height * 0.5 - this.height * 0.5;
    } else if (this.directionX === -1) {
      this.positionX = playerX;
      this.positionY =
        playerY + this.game.player.height * 0.5 - this.height * 0.5;
    } else if (this.directionY === 1) {
      this.positionX =
        playerX + this.game.player.width * 0.5 - this.width * 0.5;
      this.positionY = playerY + this.game.player.height;
    } else if (this.directionY === -1) {
      this.positionX =
        playerX + this.game.player.width * 0.5 - this.width * 0.5;
      this.positionY = playerY;
    } else {
      return;
    }
    this.free = false;
  }
  reset() {
    this.free = true;
  }
}

class EnemyProjectile extends Projectile {
  constructor(game) {
    super(game);

    this.enemy;

    this.directionX = this.enemy?.directionX;
    this.directionY = this.enemy?.directionY;

    this.free = true;
  }

  update() {
    if (this.free && this.enemy) {
      this.directionX = this.enemy.directionX;
      this.directionY = this.enemy.directionY;
    }

    if (!this.isOnCanvas()) {
      //Menjaj direkciju
      //1. menjaj direkciju samo kada vise nije na canvasu
      this.directionX = this.enemy.directionX;
      this.directionY = this.enemy.directionY;
      //2. resetuj kada nije na canvasu
      this.reset();
    }

    if (!this.free) {
      if (this.directionX === 1) {
        this.positionX += this.speed;
      }
      if (this.directionX === -1) {
        this.positionX -= this.speed;
      }
      if (this.directionY === 1) {
        this.positionY += this.speed;
      }
      if (this.directionY === -1) {
        this.positionY -= this.speed;
      }

      if (this.directionX === 0 && this.directionY === 0) {
      }
    }
  }
  draw(context) {
    if (!this.free) {
      context.drawImage(
        this.image,
        0,
        0,
        1024,
        1024,
        this.positionX - this.width * 0.5 + 5,
        this.positionY - this.height * 0.5 - 12,
        10,
        10
      );
    }
  }
  //Additional condition so that projectile`s and player`s direction are the same
  start() {
    if (this.enemy) {
      if (this.directionX === 1 /*&& this.enemy.directionX === 1*/) {
        this.positionX = this.enemy.positionX + this.enemy.width;
        this.positionY =
          this.enemy.positionY + this.enemy.height * 0.5 - this.height * 0.5;
      }
      if (this.directionX === -1 /*&& this.enemy.directionX === -1*/) {
        this.positionX = this.enemy.positionX;
        this.positionY =
          this.enemy.positionY + this.enemy.height * 0.5 - this.height * 0.5;
      }
      if (this.directionY === 1 /*&& this.enemy.directionY === 1*/) {
        this.positionX =
          this.enemy.positionX + this.enemy.width * 0.5 - this.width * 0.5;
        this.positionY = this.enemy.positionY + this.enemy.height;
      }
      if (this.directionY === -1 /*&& this.enemy.directionY === -1*/) {
        this.positionX =
          this.enemy.positionX + this.enemy.width * 0.5 - this.width * 0.5;
        this.positionY = this.enemy.positionY;
      }
      this.free = false;
    }
  }
  reset() {
    this.free = true;
  }
}

class Heart {
  constructor(game) {
    this.game = game;
    this.width = 80;
    this.height = 80;
    //Random pozicije
    this.positionX =
      Math.floor(Math.random() * (this.game.width / this.width)) * this.width;
    this.positionY =
      (Math.floor(Math.random() * (this.game.height / this.height - 1)) + 1) *
      this.height;

    this.timer = 0;
    this.interval = 5000;
    this.isVisible = false;

    //Assets Visual
    this.image = document.getElementById('heart-image');
    this.imageFrame = 0;
    this.maxFrames = 3;
    //Assets Audio
    this.audioCollected = new Howl({ src: ['HeartCollected.wav'] });
    this.deploy();
  }

  deploy() {
    //Randomize
    this.positionX =
      Math.floor(Math.random() * (this.game.width / this.width)) * this.width;
    this.positionY =
      (Math.floor(Math.random() * (this.game.height / this.height - 1)) + 1) *
      this.height;

    //To avoid overlapping with enemies
    this.game.enemies.forEach(enemy => {
      if (
        this.positionX === enemy.positionX &&
        this.positionY === enemy.positionY
      ) {
        this.positionX =
          Math.floor(Math.random() * (this.game.width / this.width)) *
          this.width;
        this.positionY =
          (Math.floor(Math.random() * (this.game.height / this.height - 1)) +
            1) *
          this.height;
      }
    });
  }

  draw(context) {
    context.drawImage(
      this.image,
      this.imageFrame * 127,
      0,
      127,
      132,
      this.positionX + 10,
      this.positionY + 10,
      this.width - 20,
      this.height - 20
    );
  }

  update() {
    //Avoid obstacles
    this.game.obstacles.forEach(obstacle => {
      //To avoid overlapping with obstacles
      if (
        !obstacle.isDestroyed &&
        this.positionX === obstacle.positionX &&
        this.positionY === obstacle.positionY
      ) {
        this.positionX =
          Math.floor(Math.random() * (this.game.width / this.width)) *
          this.width;
        this.positionY =
          (Math.floor(Math.random() * (this.game.height / this.height - 1)) +
            1) *
          this.height;
      }
    });
    //Collision with player

    if (
      this.isVisible &&
      this.game.checkCollision(this, this.game.player) &&
      this.game.player.health < this.game.player.maxHealth
    ) {
      this.game.player.health = this.game.player.maxHealth;
      this.isVisible = false;
      this.audioCollected.play();

      this.timer = 0;
    }

    if (!this.isVisible) {
      this.deploy();
    }

    if (this.isVisible && this.game.spriteUpdate) {
      this.imageFrame++;
      if (this.imageFrame > this.maxFrames) {
        this.imageFrame = 0;
      }
    }
  }
}

window.addEventListener('load', function () {
  const canvas = document.getElementById('canvas1');
  const ctx = canvas.getContext('2d');

  canvas.width = 1200;
  canvas.height = 640;

  ctx.fillStyle = 'greenyellow';
  ctx.font = '20px "Press Start 2P"';

  const game = new Game(canvas);

  let lastTime = 0;
  function animate(timeStamp) {
    let deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    //Animation loop
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    game.render(ctx, deltaTime);
    window.requestAnimationFrame(animate);
  }

  animate(0);
});
