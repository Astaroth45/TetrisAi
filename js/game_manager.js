function GameManager(){
    var gridCanvas = document.getElementById('grid-canvas');
    var nextCanvas = document.getElementById('next-canvas');
    var scoreContainer = document.getElementById("score-container");
    var resetButton = document.getElementById('reset-button');
    var backButton = document.getElementById('back-button');
    var aiButton = document.getElementById('ai-button');
    var gridContext = gridCanvas.getContext('2d');
    var nextContext = nextCanvas.getContext('2d');
    document.addEventListener('keydown', onKeyDown);

    var grid = new Grid(22, 10);
    var rpg = new RandomPieceGenerator();
    var ai = new AI(0.510066, 0.760666, 0.35663, 0.184483);
    var workingPieces = [null, rpg.nextPiece()];
    var workingPiece = null;
    var isAiActive = true;
    var isKeyEnabled = false;
    var gravityTimer = new Timer(onGravityTimerTick, 500);
    var score = 0;

    // Graphics
    function intToRGBHexString(v){
        return 'rgb(' + ((v >> 16) & 0xFF) + ',' + ((v >> 8) & 0xFF) + ',' + (v & 0xFF) + ')';
    }

    function redrawGridCanvas(workingPieceVerticalOffset = 0){
        gridContext.save();

        // Clear
        gridContext.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

        // Draw grid
        for(var r = 3; r < grid.rows; r++){
            for(var c = 0; c < grid.columns; c++){
                if (grid.cells[r][c] != 0){
                    gridContext.fillStyle= intToRGBHexString(grid.cells[r][c]);
                    gridContext.fillRect(27 * c, 27 * (r - 3.4), 27, 27);
                    gridContext.strokeStyle="#FFFFFF";
                    gridContext.strokeRect(27 * c, 27 * (r - 3.4), 27, 27);
                }
            }
        }

        // Draw working piece
        for(var r = 0; r < workingPiece.dimension; r++){
            for(var c = 0; c < workingPiece.dimension; c++){
                if (workingPiece.cells[r][c] != 0){
                    gridContext.fillStyle = intToRGBHexString(workingPiece.cells[r][c]);
                    gridContext.fillRect(27 * (c + workingPiece.column), 27 * ((r + workingPiece.row) - 3.4) + workingPieceVerticalOffset, 27, 27);
                    gridContext.strokeStyle="#FFFFFF";
                    gridContext.strokeRect(27 * (c + workingPiece.column), 27 * ((r + workingPiece.row) - 3.4) + workingPieceVerticalOffset, 27, 27);
                }
            }
        }

        gridContext.restore();
    }

    function redrawNextCanvas(){
        nextContext.save();

        nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        var next = workingPieces[1];
        var xOffset = next.dimension == 2 ? 20 : next.dimension == 3 ? 10 : next.dimension == 4 ? 0 : null;
        var yOffset = next.dimension == 2 ? 20 : next.dimension == 3 ? 20 : next.dimension == 4 ? 10 : null;
        for(var r = 0; r < next.dimension; r++){
            for(var c = 0; c < next.dimension; c++){
                if (next.cells[r][c] != 0){
                    nextContext.fillStyle = intToRGBHexString(next.cells[r][c]);
                    nextContext.fillRect(xOffset + 20 * c, yOffset + 20 * r, 20, 20);
                    nextContext.strokeStyle = "#FFFFFF";
                    nextContext.strokeRect(xOffset + 20 * c, yOffset + 20 * r, 20, 20);
                }
            }
        }

        nextContext.restore();
    }

    function updateScoreContainer(){
        scoreContainer.innerHTML = score.toString();
    }

    // Drop animation
    var workingPieceDropAnimationStopwatch = null;

    function startWorkingPieceDropAnimation(callback = function(){}){
        // Calculate animation height
        animationHeight = 0;
        _workingPiece = workingPiece.clone();
        while(_workingPiece.moveDown(grid)){
            animationHeight++;
        }

        var stopwatch = new Stopwatch(function(elapsed){
            if(elapsed >= animationHeight * 27){
                stopwatch.stop();
                redrawGridCanvas(27 * animationHeight);
                callback();
                return;
            }

            redrawGridCanvas(27 * elapsed / 27);
        });

        workingPieceDropAnimationStopwatch = stopwatch;
    }

    function cancelWorkingPieceDropAnimation(){
        if(workingPieceDropAnimationStopwatch === null){
            return;
        }
        workingPieceDropAnimationStopwatch.stop();
        workingPieceDropAnimationStopwatch = null;
    }

    // Process start of turn
    function startTurn(){
        // Shift working pieces
        for(var i = 0; i < workingPieces.length - 1; i++){
            workingPieces[i] = workingPieces[i + 1];
        }
        workingPieces[workingPieces.length - 1] = rpg.nextPiece();
        workingPiece = workingPieces[0];

        // Refresh Graphics
        redrawGridCanvas();
        redrawNextCanvas();

        if(isAiActive){
            isKeyEnabled = false;
            workingPiece = ai.best(grid, workingPieces);
            startWorkingPieceDropAnimation(function(){
                while(workingPiece.moveDown(grid)); // Drop working piece
                if(!endTurn()){
                    document.getElementById("myBtn").click();
                    return;
                }
                startTurn();
            })
        }else{
            isKeyEnabled = true;
            gravityTimer.resetForward(500);
        }
    }

    // Process end of turn
    function endTurn(){
        // Add working piece
        grid.addPiece(workingPiece);

        // Clear lines
        score += grid.clearLines();

        // Refresh graphics
        redrawGridCanvas();
        updateScoreContainer();

        return !grid.exceeded();
    }

    // Process gravity tick
    function onGravityTimerTick(){
        // If working piece has not reached bottom
        if(workingPiece.canMoveDown(grid)){
            workingPiece.moveDown(grid);
            redrawGridCanvas();
            return;
        }

        // Stop gravity if working piece has reached bottom
        gravityTimer.stop();

        // If working piece has reached bottom, end of turn has been processed
        // and game cannot continue because grid has been exceeded
        if(!endTurn()){
            isKeyEnabled = false;
            document.getElementById("myBtn").click();
            return;
        }

        // If working piece has reached bottom, end of turn has been processed
        // and game can still continue.
        startTurn();
    }

    // Process keys
    function onKeyDown(event){
        if(!isKeyEnabled){
            return;
        }
        switch(event.which){
            case 32: // spacebar
                isKeyEnabled = false;
                gravityTimer.stop(); // Stop gravity
                startWorkingPieceDropAnimation(function(){ // Start drop animation
                    while(workingPiece.moveDown(grid)); // Drop working piece
                    if(!endTurn()){
                        document.getElementById("myBtn").click();
                        return;
                    }
                    startTurn();
                });
                break;
            case 40: // down
                gravityTimer.resetForward(500);
                break;
            case 37: //left
                if(workingPiece.canMoveLeft(grid)){
                    workingPiece.moveLeft(grid);
                    redrawGridCanvas();
                }
                break;
            case 39: //right
                if(workingPiece.canMoveRight(grid)){
                    workingPiece.moveRight(grid);
                    redrawGridCanvas();
                }
                break;
            case 90: //up
                workingPiece.rotate(grid);
                redrawGridCanvas();
                break;
        }
    }

    
    
    resetButton.onclick = function(){
        gravityTimer.stop();
        cancelWorkingPieceDropAnimation();
        grid = new Grid(22, 10);
        rpg = new RandomPieceGenerator();
        workingPieces = [null, rpg.nextPiece()];
        workingPiece = null;
        score = 0;
        isKeyEnabled = true;
        updateScoreContainer();
        startTurn();
    }

    
    startTurn();
}
