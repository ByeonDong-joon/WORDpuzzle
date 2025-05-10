(function(){
  const cellSize = 40;
  let canvas, ctx, gridSize;
  let grid = [], used = [], loadedWords = [], slots = [], previewPath = [];
  let start, end, score = 0, timer = 0, lives = 3, interval;
  let dragging = false, gameOver = false;

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', () => location.reload());
  });

  function startGame() {
    gridSize = parseInt(document.getElementById("sizeSelect").value);
    canvas = document.getElementById("puzzleCanvas");
    ctx = canvas.getContext("2d");
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    document.getElementById("setup").hidden = true;
    document.getElementById("gameArea").hidden = false;

    fetch("words.txt")
      .then(res => res.text())
      .then(text => {
        loadedWords = text.trim().split(/\r?\n/).map(w => w.toUpperCase());
        slots = [];
        generateGrid();
        drawAll();
        populateList();
        startTimer();
      })
      .catch(err => alert("Failed to load words: " + err));
  }

  function startTimer(){
    timer = 0;
    updateInfo();
    clearInterval(interval);
    interval = setInterval(() => {
      timer++;
      updateInfo();
    }, 1000);
  }

  const directions = [
    {dx:1, dy:0}, {dx:-1, dy:0}, {dx:0, dy:1}, {dx:0, dy:-1},
    {dx:1, dy:1}, {dx:1, dy:-1}, {dx:-1, dy:1}, {dx:-1, dy:-1}
  ];

  function generateGrid(){
    // 1) 랜덤 문자로 초기화
    grid = Array.from({length: gridSize}, () =>
      Array.from({length: gridSize}, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      )
    );
    // 2) 사용 여부 초기화
    used = Array.from({length: gridSize}, () =>
      Array.from({length: gridSize}, () => false)
    );
    // 3) 단어 배치
    loadedWords.forEach(word => {
      const path = placeWord(word);
      if (path) slots.push({word, path, found: false});
    });
    // 4) 마우스 이벤트 연결
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup',   onUp);
  }

  function placeWord(word){
    for (let tries = 0; tries < 1000; tries++){
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      if (!canPlace(word, row, col, dir)) continue;
      const path = [];
      for (let i = 0; i < word.length; i++){
        const x = col + dir.dx * i;
        const y = row + dir.dy * i;
        path.push({x, y});
      }
      // 실제 그리드와 used 표시 갱신
      path.forEach((p, i) => {
        grid[p.y][p.x] = word[i];
        used[p.y][p.x] = true;
      });
      return path;
    }
    return null;  // 배치 실패
  }

  function canPlace(word, row, col, dir){
    return word.split('').every((ch, i) => {
      const r = row + dir.dy * i;
      const c = col + dir.dx * i;
      // 1) 범위 검사
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
      // 2) 충돌 검사: 이미 다른 단어가 차지한 칸은
      //    같은 문자(ch)일 때만 겹치기 허용
      return !used[r][c] || grid[r][c] === ch;
    });
  }

  function drawGrid(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "20px Arial";
    ctx.textBaseline = "middle";
    ctx.textAlign    = "center";
    for (let r = 0; r < gridSize; r++){
      for (let c = 0; c < gridSize; c++){
        ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        ctx.fillStyle = "#000";
        ctx.fillText(grid[r][c], c * cellSize + cellSize/2, r * cellSize + cellSize/2);
      }
    }
  }

  function drawAll(){
    drawGrid();
    // 정답(초록) 혹은 게임오버 표시(빨강)
    slots.forEach(s => {
      if (s.found || gameOver){
        ctx.fillStyle = s.found ? "rgba(50,200,50,0.4)" : "rgba(255,0,0,0.4)";
        s.path.forEach(p => ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize));
      }
    });
    // 드래그 미리보기(파랑)
    if (dragging){
      ctx.fillStyle = "rgba(0,0,255,0.3)";
      previewPath.forEach(p => ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize));
    }
  }

  function updateInfo(){
    document.getElementById("timer").innerText = `⏱ Time: ${timer}s`;
    document.getElementById("score").innerText = `✅ Score: ${score}`;
    document.getElementById("lives").innerText = "❤️".repeat(lives);
  }

  function populateList(){
    const ul = document.getElementById("wordItems");
    ul.innerHTML = "";
    slots.forEach(s => {
      const li = document.createElement("li");
      li.innerText = s.word;
      li.dataset.word = s.word;
      ul.appendChild(li);
    });
  }

  function onDown(e){
    if (gameOver) return;
    dragging = true;
    start = {x: Math.floor(e.offsetX/cellSize), y: Math.floor(e.offsetY/cellSize)};
    previewPath = [start];
    drawAll();
  }
  function onMove(e){
    if (!dragging || gameOver) return;
    end = {x: Math.floor(e.offsetX/cellSize), y: Math.floor(e.offsetY/cellSize)};
    updatePreview();
    drawAll();
  }
  function onUp(e){
    if (!dragging || gameOver) return;
    dragging = false;
    end = {x: Math.floor(e.offsetX/cellSize), y: Math.floor(e.offsetY/cellSize)};
    checkSelection();
    previewPath = [];
    drawAll();
  }

  function updatePreview(){
    previewPath = [];
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    const len = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) + 1;
    for (let i = 0; i < len; i++){
      const x = start.x + dx * i, y = start.y + dy * i;
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize){
        previewPath.push({x, y});
      }
    }
  }

  function checkSelection(){
    let letters = "", path = [];
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    const len = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) + 1;
    for (let i = 0; i < len; i++){
      const x = start.x + dx * i, y = start.y + dy * i;
      if (x<0||x>=gridSize||y<0||y>=gridSize) return;
      letters += grid[y][x];
      path.push({x,y});
    }
    const slot = slots.find(s => s.word === letters);
    if (slot && !slot.found){
      slot.found = true;
      score++;
      document.querySelector(`#wordItems li[data-word="${letters}"]`).classList.add("found");
      updateInfo();
      if (slots.every(s=>s.found)) endGame("🎉 You found all words!");
    } else {
      lives--;
      updateInfo();
      if (lives <= 0) endGame("💀 Game Over!");
    }
  }

  function endGame(msg){
    gameOver = true;
    clearInterval(interval);
    alert(msg);
    document.getElementById("restartBtn").hidden = false;
    drawAll();
  }
})();
