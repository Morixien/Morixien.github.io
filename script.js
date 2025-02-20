// The game board
//   0 1 2 3 4
// 0 x x x x x
// 1 x x x x x
// 2 x x x x x
// 3 x x x x x
// 4 x x x x x

// Global variables
var grid = document.getElementsByClassName("sqr");  // find and store the grid of squares
var pressedGrid = [];                               // denotes if a square is pressed (1) or not pressed (-1) as well as alive-time for pressed squares
var noteMap = [];                                   // stores the coordinates of the notes and their timing
var bitList = [];                                   // for animating albin turning around, stores 1s and 0s based on left or right mirroring

// Song settings
const miiThemeAudio = new Audio("mii-theme-cursed.mp3");   // song        

// Map
const size = 5;                                     // size of map

// Timers
const approachRate = 1.5;   // how long a spawned square stays lit
const missDelay = 1;        // how long a missed note stays lit
const pressedDelay = 0.1;   // extra period a pressed cell stays alive for
const offset = 0.5;         // shifts the note somewhat in time to allow for delayed presses, used when "spawning" notes 

var restart = false;        // if begin button should reload the entire page or not

// Describes the notes using row, column, and when the should be pressed
const notesRaw = [
    [1, 0, 4.6],
    [1, 2, 4.9],
    [2, 1, 5.1],
    [2, 3, 5.4],
    [3, 2, 5.9],
    [3, 4, 6.4],

    [4, 0, 7.8],
    [3, 1, 8],
    [2, 2, 8.3],
    [1, 3, 8.6],
    [0, 4, 8.9],

    [3, 4, 9.5],
    [4, 3, 9.8],
    [3, 3, 10.3],
    [4, 2, 10.8],
    [3, 2, 11.3],
    [4, 1, 11.9],
    [3, 1, 12.1],
    [4, 0, 12.7],
    
    [3, 0, 13.2],
    [2, 0, 13.5], 
    [2, 1, 13.7],

    [2, 3, 15.4],
    [2, 4, 15.8],
    [3, 4, 16.1],

    [0, 0, 17.8],
    [0, 1, 17.9],
    [0, 2, 18.1],
    [0, 3, 18.2],
    [0, 4, 18.3],

    [2, 3, 18.5],
    [3, 2, 19.1],
    [2, 1, 19.4],
    [1, 2, 20.4],

    [1, 4, 20.7],
    [2, 4, 21],
    [3, 4, 21.2],

    [4, 0, 22],
    [3, 1, 22.3],
    [4, 2, 22.5],
    [3, 3, 22.8],

    [0, 0, 23.3],
    [2, 0, 23.6],
    [2, 4, 23.9],
    [0, 4, 24.1],
    [0, 2, 24.6],
    [1, 2, 25.2],

    [2, 2, 25.4],

    [1, 0, 28.3],
    [0, 1, 28.5],
    [1, 2, 28.8],
    [0, 3, 29.1],
    [1, 4, 29.6],
    [2, 3, 29.9],
    [3, 4, 30.2],
    [4, 3, 30.4],
    [3, 2, 30.7],
    [4, 1, 31],
    [3, 0, 31.2],
    [2, 1, 31.7],
    [1, 0, 32],
    [0, 1, 32.3],
    [1, 2, 32.5],

    [2, 2, 34.4]
];

// Initialize the pressed grid and set all squares to unpressed as well as alive-time to -1
for (var i = 0; i < size; i++) {
    let row = [[-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1]];
    pressedGrid.push(row);
}

// Initialize each square to register when pressed into pressedGrid
for (let i = 0; i < grid.length; i++) {
    grid[i].addEventListener("click", function () {
        let squareNo = this.classList[1];   // every square has two classes, sqr and 'sqr-##', this extracts 'sqr-##'
        logPress(squareNo.slice(4));  // extract only the number from the classname and add the logPress event
        new Audio("clicky-snare-drum-hit.wav").play();
    });
}

// The continue button (which really shouldn't be implemented in this way but I couldn't be bothered to write a single line more of HTML)
continue_btn.addEventListener("click", function() {
    location.href = 'https://datateknologerna.org/events/hackathon_xxvi/';
  }); 

// Registers pressing of the start button and initalizes the noteMap
begin.addEventListener("click", function () {
    if (restart) {
        location.reload();
    }
    
    restart = true;
    document.getElementById("explanation").style.display="none";
    document.getElementById("begin").textContent="Restart";
    document.getElementById("score").style.display="block";

    for (let i = 0; i < notesRaw.length; i++) {
        let [row, col, time] = notesRaw[i]; 
        let note = [row, col, time - approachRate + offset];
        noteMap.push(note);
    }

    randomizedBitList(noteMap.length);
    gameLoop(); // begin the gameplay
});

// Registers a square-press and sets it to stay pressed as long as squares are lit as well as a little extra delay
function logPress(squareNo) {
    [row, col] = rowColFromIndex(squareNo);
    pressedGrid[row][col] = [1, miiThemeAudio.currentTime + approachRate + pressedDelay];
}

var notesMissed = 0;                // This is ugly as hell but eh, tracks how many notes we've actually missed
function gameLoop() {
    // Counters
    let spawnCounter = 0;               // tracks how far along the noteMap we are as seen to spawned notes
    let removeCounter = 0;              // tracks how far along the notemap we are as to spawned THEN timed-out notes
    let missedCounter = 0;              // tracks how far along the missed-notes-list we are
    const totalNotes = noteMap.length;
    const totalPressed = pressedGrid.length;

    miiThemeAudio.play();

    const bar = document.querySelector('.bar');

    let currentTime = miiThemeAudio.currentTime;    // always needed to be checked since the notes play based on length in song
    const delay = 50;                               // how often the setInterval loops in milliseconds

    // Set interval is needed so that graphics may update itself after each loop
    let iID = setInterval(function () {
        spawnCounter = spawnNotes(spawnCounter, totalNotes, currentTime);
        removeCounter = removeNotes(removeCounter, totalNotes, currentTime);
        missedCounter = removeMissedNotes(missedCounter, totalNotes, currentTime);
        resetPressedNotes(totalPressed);

        // This is just to update the score counter
        percentage = Math.floor((removeCounter - notesMissed) / removeCounter * 100)
        bar.style.width = percentage + '%'; // update score bar
        
        // Check that if any note is left waiting to be updated, if not then exit the loop
        if (spawnCounter >= totalNotes && removeCounter >= totalNotes && missedCounter >= totalNotes) {
            endActions(removeCounter, missedCounter);
            clearInterval(iID);
        }
        currentTime = miiThemeAudio.currentTime;
    }, delay);
}

// Here we can put end of eventloop actions
function endActions(removeCounter) {
    mayEnter = false;
    score = Math.floor((removeCounter - notesMissed) / removeCounter * 100)
    weightedScore = mapScore(score);
    document.querySelector('.bar').style.width = weightedScore + '%'; // update score bar
    scoreText = "You got a score of " + weightedScore + "%. ";
    if (weightedScore == 0) {
        scoreText += "What is wrong with you? Albin needed your help, not whatever you did. As \
        a result of Albins drunken stumbling and your non-help Albin broke every single bone in their body and \
        is now in a alcohol induced coma. There is no one left to grant you entry to the webpage, \
        not that you deserve it anyway.";
    } else if (weightedScore < 69) {
        scoreText += "Oh no! Albin fell one too many times and broke a leg. Unfortunately \
        they can't let you in until they've been to the hospital and gotten patched up. \
        Try again.";
    } else if (weightedScore == 69) {
        mayEnter = true;
        scoreText += "Phew that could have been bad! Albin is incredibly thankful that you \
        caught them before they got really hurt and is ready to go home and sleep, but not before \
        granting you access to the website as a thank you.";
    } else if (weightedScore == 100) {
        scoreText += "How did you do that? Albin is so impressed that they don't belive that you're \
        actually a human and assumes that you therefore must be a robot. You are not granted entrance \
        but you are invited to try again.";
    } else if (weightedScore < 100) {
        scoreText += "Albin just kinda stands up and walks away, insisting that 'they're fine', that they \
        'didn't even need any help in the first place' and that they're 'not even that drunk anyway'. \
        In trying to assert their chipelliness and tolerance for alcohol they completely forget to let \
        you enter the website. Maybe you should let Albin fall once and again to show that they're not \
        as sturdy as they think. Try again.";
    }

    document.getElementById("grid").style.display = "none";
    document.getElementById("end-text").textContent = scoreText;
    document.getElementById("end-text").style.display = "block";

    if (mayEnter) {
        document.getElementById("header_text").textContent = "Access granted.";
        document.getElementById("continue_btn").style.display = "inline";
    }
}

// Resets the pressed notes if timed out, otherwise leaves them pressed
function resetPressedNotes(totalPressed) {
    for (let i = 0; i < totalPressed; i++) {
        row = pressedGrid[i];
        for (let j = 0; j < row.length; j++) {
            square = row[j];
            [state, remove_time] = square;
            if (state == 1 && remove_time < miiThemeAudio.currentTime) {
                pressedGrid[i][j] = [-1, -1];
            }
        }

    }
}

// Removing missed note graphics
function removeMissedNotes(missedCounter, totalNotes, currentTime) {
    // if (missedCounter < missed.length) {
    //     missedNote = noteMap[missed[missedCounter]]; // extract next note in line
    //     [row, col, time] = missedNote;

    //     if (time + approachRate + missDelay <= currentTime) { // hope and pray that we never have missed notes to remove within the same interval
    //         let index = indexFromRowCol([row, col]);
    //         let square = grid[index];
    //         square.classList.remove("note-missed"); // update the square graphics to remove the living note
    //         missedCounter = missedCounter + 1; // step forward the missed counter to point to next note in line
    //     }
    // }
    // return missedCounter;

    if (missedCounter < totalNotes) { // ensure no out of bounds indexing
        missedNote = noteMap[missedCounter]; // extract next note in line
        [row, col, time] = missedNote;

        if (time + approachRate + missDelay <= currentTime) { // hope and pray that we never have notes to remove within the same interval
            let index = indexFromRowCol([row, col]);
            let square = grid[index];
            square.classList.remove("note-missed"); // update the square graphics to remove the missed note
            missedCounter = missedCounter + 1; // step forward the remove counter to point to next note in line
        }
    }
    return missedCounter;
}

// Removing and press-checking old notes
function removeNotes(removeCounter, totalNotes, currentTime) {
    if (removeCounter < totalNotes) { // ensure no out of bounds indexing
        removeNote = noteMap[removeCounter]; // extract next note in line
        [row, col, time] = removeNote;

        if (time + approachRate <= currentTime) { // hope and pray that we never have notes to remove within the same interval
            let index = indexFromRowCol([row, col]);
            let square = grid[index];
            square.classList.remove("note-0"); // update the square graphics to remove the living note
            square.classList.remove("note-1"); // update the square graphics to remove the living note

            removeCounter = removeCounter + 1; // step forward the remove counter to point to next note in line

            // Check if the note was missed, if missed note display note-missed graphics and add to missed list
            if (pressedGrid[row][col][0] != 1) {
                square.classList.add("note-missed");
                notesMissed = notesMissed + 1;
                // missed.push(index - 1); // don't ask me why it's index-1 and not just index, I really don't get it myself
            }
        }
    }
    return removeCounter;
}

// Spawning of new notes
function spawnNotes(spawnCounter, totalNotes, currentTime) {
    if (spawnCounter < totalNotes) { // ensure no out of bounds indexing
        spawnNote = noteMap[spawnCounter]; // extract next note in line
        [row, col, time] = spawnNote;

        if (time <= currentTime) { // hope and pray that we never have notes spawning within the same interval
            let index = indexFromRowCol([row, col]);
            let square = grid[index];

            // update the square graphics to show a note
            if (bitList[spawnCounter] == 0) {
                square.classList.add("note-0"); 
            } else {
                square.classList.add("note-1");
            }
            
            spawnCounter = spawnCounter + 1; // step forward the spawn counter to point to next note in line
        }
    }
    return spawnCounter;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// -- -- -- -- -- Helper Functions -- -- -- -- -- ///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function rowColFromIndex(squareNo) {
    let row = Math.floor(squareNo / size);
    let col = squareNo % size;
    return [row, col];
}

function indexFromRowCol([row, col]) {
    return size * row + col;
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function randomizedBitList(length) {
    let ones = Math.floor(length / 2);
    let zeros = length - ones;

    while (ones > 0) {
        bitList.push(1);
        ones = ones - 1;
    }

    while (zeros > 0) {
        bitList.push(0);
        zeros = zeros - 1;
    }

    let currentIndex = bitList.length;

    while (currentIndex > 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex = currentIndex - 1;
        [bitList[currentIndex], bitList[randomIndex]] = [bitList[randomIndex], bitList[currentIndex]];
    }

    return bitList;
}

function mapScore(score) {
    if (score < 54) {
        return (score / 54) * 54;
    } else if (score >= 54 && score <= 74) {
        return 69;
    } else {
        return ((score - 74) / 26) * 26 + 74;
    }
}

function updateBar(percentage) {
    const bar = document.querySelector('.bar');
    bar.style.width = percentage + '%';
}