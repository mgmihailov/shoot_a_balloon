(function () {
    var GUN_HEIGHT = 200,
        GUN_WIDTH = 60,
        GUN_RADIUS = Math.sqrt(GUN_WIDTH * GUN_WIDTH + GUN_HEIGHT * GUN_HEIGHT) / 2,
        GUN_P1_ORIGINAL_ANGLE = Math.tan(GUN_WIDTH / GUN_HEIGHT),
        GUN_P2_ORIGINAL_ANGLE = Math.PI - Math.tan(GUN_WIDTH / GUN_HEIGHT),
        GUN_P3_ORIGINAL_ANGLE = Math.PI + Math.tan(GUN_WIDTH / GUN_HEIGHT),
        GUN_P4_ORIGINAL_ANGLE = 2 * Math.PI - Math.tan(GUN_WIDTH / GUN_HEIGHT),
        GAME_NOT_STARTED = 0,
        GAME_STARTED = 1,
        GAME_PAUSED = 2,
        GAME_OVER = 3,
        GAME_COMPLETE = 4,
        CANNON_ATTACK_SPEED = 300,
        MAX_LEVEL = 50,
        BALLOON_RADIUS = 30;

    var canvas = document.getElementById("canvas"),
        canvasContext = canvas.getContext("2d"),
        lastIteration = 0,
        gunAngle = 0 * Math.PI / 180,
        transform = {
            origin: {
                x: 0,
                y: 0
            },
            xOffset: canvas.width / 2,
            yOffset: canvas.height
        },
        bullets = [],
        balloons = [],
        gameState = GAME_NOT_STARTED,
        gun = {
            p1: {
                x: (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P1_ORIGINAL_ANGLE + gunAngle)),
                y: (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P1_ORIGINAL_ANGLE + gunAngle))
            },
            p2: {
                x: (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P2_ORIGINAL_ANGLE + gunAngle)),
                y: (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P2_ORIGINAL_ANGLE + gunAngle))
            },
            p3: {
                x: (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P3_ORIGINAL_ANGLE + gunAngle)),
                y: (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P3_ORIGINAL_ANGLE + gunAngle))
            },
            p4: {
                x: (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P4_ORIGINAL_ANGLE + gunAngle)),
                y: (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P4_ORIGINAL_ANGLE + gunAngle))
            }
        },
        cursorPosition = {
            x: null,
            y: null
        },
        loadedImages = 0,
        images = [],
        spawnBalloonsCountdown = null,
        roundTimer = null,
        level = 0,
        poppedBalloons = -1,
        score = 0,
        cannonCooldown = 0;

    function gameLoop() {
        var now = Date.now();
        var difference = (lastIteration === 0) ? (0) : (now - lastIteration);

        if (loadedImages === 9) {
            update(difference);
            render();
        }

        lastIteration = now;

        requestAnimationFrame(gameLoop);
    }

    function update(deltaTime) {
        if (gameState === GAME_STARTED && loadedImages === 9) {
            if (bullets.length !== 0) {
                updateBullets();
            }
            if (spawnBalloonsCountdown > 0) {
                spawnBalloonsCountdown -= deltaTime;
            } else {
                if (balloons.length === poppedBalloons) {
                    score = parseInt(score + roundTimer * level);
                    initLevel();
                } else {
                    detectCollision();
                    updateBalloons();
                    updateTimer(deltaTime);
                    updateCannonCooldown(deltaTime);
                }
            }
        }
    }

    function render() {
        if (loadedImages === 9) {
            canvasContext.drawImage(images[0], 0, 0);
            if (gameState === GAME_STARTED || gameState === GAME_PAUSED) {

                for (var bullet in bullets) {
                    if (bullets[bullet]) {
                        canvasContext.beginPath();
                        canvasContext.fillStyle = "#FF0000";
                        canvasContext.arc(bullets[bullet].x, bullets[bullet].y, 5, 0, Math.PI * 2);
                        canvasContext.closePath();
                        canvasContext.fill();
                    }
                }

                for (var balloon in balloons) {
                    if (balloons[balloon]) {
                        canvasContext.save();
                        canvasContext.translate(balloons[balloon].x - BALLOON_RADIUS, balloons[balloon].y - BALLOON_RADIUS);
                        canvasContext.drawImage(balloons[balloon].sprite, 0, 0);
                        canvasContext.restore();
                    }
                }

                if (spawnBalloonsCountdown > 0) {
                    canvasContext.font = "70px Calibri";
                    canvasContext.fillStyle = "#FF0000";
                    canvasContext.fillText(parseInt(spawnBalloonsCountdown / 1000) + 1, (canvas.width / 2) - 20, (canvas.height / 2) - 35);
                    canvasContext.fillText("LEVEL " + level, (canvas.width / 2) - 100, canvas.height / 2 - 90);
                }

                // Draw the cannon
                canvasContext.save();
                canvasContext.translate(canvas.width / 2, canvas.height);
                canvasContext.rotate(-gunAngle);
                canvasContext.drawImage(images[1], GUN_WIDTH / -2, GUN_HEIGHT / -2);
                canvasContext.restore();

                //Draw the ray of the cannon
                canvasContext.strokeStyle = "#FF0000";
                canvasContext.lineWidth = "2";
                canvasContext.setLineDash([5,15]);
                canvasContext.beginPath();
                canvasContext.moveTo(Math.round((gun.p2.x + gun.p3.x) / 2 - Math.abs((gun.p2.x - gun.p3.x) / 2)) + Math.abs(gun.p2.x - gun.p3.x) / 2, Math.round((gun.p2.y + gun.p3.y) / 2 - Math.abs((gun.p2.y - gun.p3.y) / 2)) + Math.abs(gun.p2.y - gun.p3.y) / 2);
                canvasContext.lineTo(cursorPosition.x, cursorPosition.y);
                canvasContext.closePath();
                canvasContext.stroke();

                //Draw timer and score
                canvasContext.font = "40px Calibri";
                canvasContext.fillStyle = "#FF0000";
                canvasContext.fillText(roundTimer, 10, 30);
                canvasContext.fillText("Score: " + parseInt(score), canvas.width / 2 - 60, 30);

                //Draw cannon cooldown
                canvasContext.setLineDash([]);
                canvasContext.fillStyle = "#FF0000";
                canvasContext.fillRect(620, 10, 60, 20);
                canvasContext.fillStyle = "#00FF00";
                canvasContext.fillRect(620, 10, 60 - 2 * cannonCooldown / 10, 20);
                canvasContext.strokeStyle = "#000000";
                canvasContext.strokeRect(620, 10, 60, 20);
            }

            if (gameState === GAME_OVER) {
                canvasContext.fillStyle = "#000000";
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                canvasContext.font = "70px Calibri";
                canvasContext.fillStyle = "#FFFFFF";
                canvasContext.fillText("GAME OVER", canvas.width / 2 - 180, canvas.height / 2);
                canvasContext.font = "40px Calibri";
                canvasContext.fillText("To play again", canvas.width / 2 - 100, canvas.height / 2 + 60);
                canvasContext.fillText("press SPACE", canvas.width / 2 - 90, canvas.height / 2 + 100);
            }

            if (gameState === GAME_NOT_STARTED) {
                canvasContext.fillStyle = "#000000";
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                canvasContext.font = "70px Calibri";
                canvasContext.fillStyle = "#FFFFFF";
                canvasContext.fillText("Shoot a Balloon", canvas.width / 2 - 220, canvas.height / 2);
                canvasContext.font = "40px Calibri";
                canvasContext.fillText("To start", canvas.width / 2 - 60, canvas.height / 2 + 60);
                canvasContext.fillText("press SPACE", canvas.width / 2 - 90, canvas.height / 2 + 100);
            }

            if (gameState === GAME_PAUSED) {
                canvasContext.fillStyle = "#FF0000";
                canvasContext.font = "70px Calibri";
                canvasContext.fillText("PAUSED", canvas.width / 2 - 100, canvas.height / 2);
            }

            if (gameState === GAME_COMPLETE) {
                canvasContext.fillStyle = "#000000";
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                canvasContext.fillStyle = "#FFFFFF";
                canvasContext.font = "70px Calibri";
                canvasContext.fillText("YOU WON!", canvas.width / 2 - 180, canvas.height / 2);
            }
        }
    }

    function loadImages() {
        for (var i = 0; i < 9; i++) {
            var image = new Image();
            image.src = "images/" + i + ".png";
            image.onload = function () {
                loadedImages += 1;
            };
            images.push(image);
        }
    }

    //A function that spawns balloons
    function spawnBalloons(count, speed) {
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * 2 * Math.PI,
                randomSprite = Math.round(2 + Math.random() * 6);
            balloons.push({
                xDir: Math.sin(angle),
                yDir: Math.cos(angle),
                x: Math.round(2 * BALLOON_RADIUS + 4 + Math.random() * (canvas.width - 4 * BALLOON_RADIUS - 8)),
                y: Math.round(2 * BALLOON_RADIUS + 4 + Math.random() * (canvas.height - 4 * BALLOON_RADIUS - 8)),
                radius: BALLOON_RADIUS,
                speed: speed,
                sprite: images[randomSprite]
            });
        }
    }

    //A function that checks collision between bullets and balloons
    function detectCollision() {
        for (var balloon in balloons) {
            if (balloons[balloon] !== undefined) {
                for (var bullet in bullets) {
                    if (bullets[bullet] !== undefined && balloons[balloon] !== undefined) {
                        if (Math.sqrt(Math.pow((balloons[balloon].x - bullets[bullet].x), 2) + Math.pow((balloons[balloon].y - bullets[bullet].y), 2)) < balloons[balloon].radius + 5) {
                            delete balloons[balloon];
                            delete bullets[bullet];
                            poppedBalloons = (poppedBalloons === -1) ? (1) : (poppedBalloons + 1);
                            score += level;
                            playSound();
                            continue;
                        }
                    } else {
                        continue;
                    }
                }
            } else {
                continue;
            }
        }
    }

    //A function that updates all the balloons' position
    function updateBalloons() {
        for (var balloon in balloons) {
            if (balloons[balloon]) {
                if (balloons[balloon].x + balloons[balloon].radius >= canvas.width || balloons[balloon].x - balloons[balloon].radius <= 0) {
                    balloons[balloon].xDir *= -1;
                }
                if (balloons[balloon].y + balloons[balloon].radius >= canvas.height || balloons[balloon].y - balloons[balloon].radius <= 0) {
                    balloons[balloon].yDir *= -1;
                }
                balloons[balloon].x += Math.round(balloons[balloon].xDir * balloons[balloon].speed);
                balloons[balloon].y += Math.round(balloons[balloon].yDir * balloons[balloon].speed);
            }
        }
    }

    //A function that updates all the bullets' position
    function updateBullets() {
        for (var bullet in bullets) {
            if (bullets[bullet] !== undefined) {
                if (bullets[bullet].y <= 0 || bullets[bullet].x >= canvas.width || bullets[bullet].x <= 0) {
                    delete bullets[bullet];
                    continue;
                }
                bullets[bullet].x += Math.round(bullets[bullet].speed * bullets[bullet].xDir);
                bullets[bullet].y += Math.round(bullets[bullet].speed * bullets[bullet].yDir);
            }
        }
    }

    //A function that updates the timer
    function updateTimer(deltaTime) {
        if (roundTimer <= 0 && balloons.length > 0) {
            gameState = GAME_OVER;
        } else {
            roundTimer = parseFloat(roundTimer - deltaTime / 1000).toFixed(2);
        }
    }

    //A function that updates the cooldown of the cannon so that it can't shoot non stop
    function updateCannonCooldown(deltaTime) {
        if (cannonCooldown > 0) {
            cannonCooldown -= deltaTime;
        }
    }

    //A function that initialize the level
    function initLevel() {
        level++;
        if (level > MAX_LEVEL) {
            gameState = GAME_COMPLETE;
        }
        var balloonSpeed = parseInt(level / 5) + 1,
            balloonCount = 12 + parseInt(level % 5) * 3;
        spawnBalloonsCountdown = 3000;
        poppedBalloons = -1;
        balloons = [];
        bullets = [];
        spawnBalloons(balloonCount, balloonSpeed);
        roundTimer = parseFloat(balloonCount + balloonSpeed + level * 0.1).toFixed(2);
        cannonCooldown = 0;
    }

    //A function that plays the sound of a balloon popping
    function playSound() {
        var audio = document.getElementsByTagName("audio")[0];
        if (audio.ended === false) {
            audio.currentTime = 0;
            audio.play();
        } else {
            audio.play();
        }
    }

    canvas.onmousemove = function (e) {
        var angleInRadians = Math.atan((canvas.width / 2 - e.layerX) / (canvas.height - e.layerY));
        if (angleInRadians > -1.25 && angleInRadians < 1.25 && gameState === GAME_STARTED) {
            gunAngle = angleInRadians;
            gun.p1.x = (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P1_ORIGINAL_ANGLE + gunAngle));
            gun.p1.y = (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P1_ORIGINAL_ANGLE + gunAngle));
            gun.p2.x = (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P2_ORIGINAL_ANGLE + gunAngle));
            gun.p2.y = (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P2_ORIGINAL_ANGLE + gunAngle));
            gun.p3.x = (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P3_ORIGINAL_ANGLE + gunAngle));
            gun.p3.y = (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P3_ORIGINAL_ANGLE + gunAngle));
            gun.p4.x = (transform.origin.x + transform.xOffset) + Math.round(GUN_RADIUS * Math.sin(GUN_P4_ORIGINAL_ANGLE + gunAngle));
            gun.p4.y = (transform.origin.y + transform.yOffset) + Math.round(GUN_RADIUS * Math.cos(GUN_P4_ORIGINAL_ANGLE + gunAngle));
            cursorPosition.x = e.layerX;
            cursorPosition.y = e.layerY;
        }
    };

    canvas.onclick = function () {
        if (gameState === GAME_STARTED && spawnBalloonsCountdown <= 0 && cannonCooldown <= 0) {
            bullets.push({
                speed: 20,
                x: (transform.origin.x + transform.xOffset) + Math.round((GUN_HEIGHT / 2) * Math.sin(Math.PI + gunAngle)),
                y: (transform.origin.y + transform.yOffset) + Math.round((GUN_HEIGHT / 2) * Math.cos(Math.PI + gunAngle)),
                xDir: Math.sin(Math.PI + gunAngle),
                yDir: Math.cos(Math.PI + gunAngle)
            });
            cannonCooldown = CANNON_ATTACK_SPEED;
        }
    };

    document.addEventListener("keypress", function (e) {
        if (e.charCode === 32) {
            switch (gameState) {
                case GAME_NOT_STARTED: {
                    gameState = GAME_STARTED;
                    initLevel();
                } break;
                case GAME_OVER: {
                    gameState = GAME_STARTED;
                    score = 0;
                    level = 0;
                    initLevel();
                } break;
                case GAME_PAUSED: {
                    gameState = GAME_STARTED;
                } break;
                case GAME_STARTED: {
                    if (spawnBalloonsCountdown <= 0) {
                        gameState = GAME_PAUSED;
                    }
                } break;
                case GAME_COMPLETE: {
                    gameState = GAME_STARTED;
                    score = 0;
                    level = 0;
                    initLevel();
                } break;
            }
        }
    });

    loadImages();
    gameLoop();
})();