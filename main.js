const axios = require("axios");

let currentPosition = {
  x: 0,
  y: 0,
};

const walkedPositions = [currentPosition];
const searchedPositions = [currentPosition];

function getPath(path) {
  return "https://mazegame.plingot.com" + path;
}

async function startGame(size = 5, seed = Math.floor(Math.random() * 25000)) {
  const {
    data: { token },
  } = await axios.post(getPath("/Game/start"), {
    size,
    seed,
  });

  return token;
}

async function stopGame(token) {
  await axios.delete(getPath("/Game"), {
    headers: {
      Authorization: token,
    },
  });
}

function getPositionFromDirection(direction) {
  return {
    x:
      currentPosition.x +
      (direction === "East" ? 1 : direction === "West" ? -1 : 0),
    y:
      currentPosition.y +
      (direction === "North" ? 1 : direction === "South" ? -1 : 0),
  };
}
function getDirectionFromPosition(position) {
  if (currentPosition.x + 1 === position.x) return "East";
  else if (currentPosition.x - 1 === position.x) return "West";
  else if (currentPosition.y + 1 === position.y) return "North";
  else if (currentPosition.y - 1 === position.y) return "South";
}

async function move(token, position, untrace = false) {
  const direction = getDirectionFromPosition(position);
  console.log("MOVED", direction);
  currentPosition = position;

  if (!untrace) {
    walkedPositions.push(position);
    searchedPositions.push(position);
  }

  await axios.put(
    getPath("/Player/move?direction=" + direction),
    {},
    {
      headers: {
        Authorization: token,
      },
    }
  );
}

async function getCurrent(token) {
  const {
    data: { paths, effect },
  } = await axios.get(getPath("/Room/current"), {
    headers: {
      Authorization: token,
    },
  });

  return {
    moves: paths.map((path) => getPositionFromDirection(path.direction)),
    foundExit: effect === "Victory",
  };
}

async function loop(token) {
  const { moves, foundExit } = await getCurrent(token);
  if (foundExit) return null;

  const walkablePositions = moves.filter(
    (move) =>
      !walkedPositions.some((pos) => move.x === pos.x && move.y === pos.y)
  );

  if (walkablePositions.length != 0) {
    await move(token, walkablePositions[0]);
  } else {
    let lastPos = searchedPositions.pop();
    while (lastPos.x === currentPosition.x && lastPos.y === currentPosition.y) {
      lastPos = searchedPositions.pop();
    }
    await move(token, lastPos);
  }

  return await loop(token);
}

async function main() {
  const size = 3 + Math.floor(Math.random() * 7);
  const seed = Math.floor(Math.random() * 25000);
  const startDate = new Date();
  console.log(
    `Starting Game \nSize: ${size}\nSeed: ${seed}\n---------------------------------------------------------------------------------------`
  );
  const token = await startGame(size, seed);

  await loop(token);
  const endDate = new Date();

  let diff = Math.abs(endDate - startDate);
  let minutes = diff / 1000 / 60;
  console.log(
    "---------------------------------------------------------------------------------------"
  );
  console.log("\nVictory");
  console.log("Taken Steps:", walkedPositions.length);
  console.log("Time to solve:", minutes.toFixed(2) + " minutes");

  await stopGame(token);
}

main();
