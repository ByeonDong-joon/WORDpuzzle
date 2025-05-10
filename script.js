
let canvas, ctx, cellSize=40, gridSize, grid=[], words=[], foundWords=[], foundPaths=[], previewPath=[];
let start, end, score=0, timer=0, lives=3, interval, dragging=false;

function startGame() {
  gridSize = parseInt(document.getElementById("sizeSelect").value);
  canvas = document.getElementById("puzzleCanvas");
  ctx = canvas.getContext("2d");
  canvas.width = gridSize * cellSize;
  canvas.height = gridSize * cellSize;
  document.getElementById("setup").style.display = "none";
  document.getElementById("gameArea").style.display = "block";
  fetch("words.txt")
    .then(res=>res.text())
    .then(text=>{
      words=text.trim().split(/\r?\n/).map(w=>w.toUpperCase());
      generateGrid();
      drawAll();
      populateWordList();
      startTimer();
    });
}

function startTimer(){
  interval=setInterval(()=>{
    timer++;
    document.getElementById("timer").innerText=`⏱ Time: ${timer}s`;
  },1000);
}

const directions=[{dx:1,dy:0},{dx:0,dy:1},{dx:1,dy:1},{dx:-1,dy:0},{dx:0,dy:-1},{dx:-1,dy:-1},{dx:1,dy:-1},{dx:-1,dy:1}];

function generateGrid(){
  grid=Array.from({length:gridSize},()=>Array.from({length:gridSize},()=>String.fromCharCode(65+Math.floor(Math.random()*26))));
  words.forEach(placeWord);
}

function placeWord(word){
  let placed=false;
  while(!placed){
    let dir=directions[Math.floor(Math.random()*directions.length)];
    let row=Math.floor(Math.random()*gridSize);
    let col=Math.floor(Math.random()*gridSize);
    if(canPlace(word,row,col,dir)){
      for(let i=0;i<word.length;i++){
        grid[row+dir.dy*i][col+dir.dx*i]=word[i];
      }
      placed=true;
    }
  }
}

function canPlace(word,row,col,dir){
  for(let i=0;i<word.length;i++){
    let r=row+dir.dy*i, c=col+dir.dx*i;
    if(r<0||r>=gridSize||c<0||c>=gridSize) return false;
  }
  return true;
}

function drawGrid(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font="20px Arial";
  ctx.textBaseline="middle";
  ctx.textAlign="center";
  for(let r=0;r<gridSize;r++){
    for(let c=0;c<gridSize;c++){
      ctx.strokeRect(c*cellSize,r*cellSize,cellSize,cellSize);
      ctx.fillStyle="#000";
      ctx.fillText(grid[r][c],c*cellSize+cellSize/2,r*cellSize+cellSize/2);
    }
  }
}

function drawHighlights(){
  foundPaths.forEach(path=>{
    ctx.fillStyle="rgba(50,200,50,0.4)";
    path.forEach(p=>ctx.fillRect(p.x*cellSize,p.y*cellSize,cellSize,cellSize));
  });
  if(dragging&&previewPath.length){
    ctx.fillStyle="rgba(0,0,255,0.3)";
    previewPath.forEach(p=>ctx.fillRect(p.x*cellSize,p.y*cellSize,cellSize,cellSize));
  }
}

function drawAll(){drawGrid();drawHighlights();}

document.addEventListener("DOMContentLoaded",()=>{
  canvas=document.getElementById("puzzleCanvas");
  ctx=canvas.getContext("2d");
  canvas.addEventListener("mousedown",e=>{
    dragging=true;
    start={x:Math.floor(e.offsetX/cellSize),y:Math.floor(e.offsetY/cellSize)};
    previewPath=[start]; drawAll();
  });
  canvas.addEventListener("mousemove",e=>{
    if(!dragging)return;
    end={x:Math.floor(e.offsetX/cellSize),y:Math.floor(e.offsetY/cellSize)};
    updatePreview(); drawAll();
  });
  canvas.addEventListener("mouseup",e=>{
    if(!dragging)return;
    dragging=false;
    end={x:Math.floor(e.offsetX/cellSize),y:Math.floor(e.offsetY/cellSize)};
    checkWord(); previewPath=[]; drawAll();
  });
});

function updatePreview(){
  previewPath=[];
  let dx=Math.sign(end.x-start.x), dy=Math.sign(end.y-start.y);
  let len=Math.max(Math.abs(end.x-start.x),Math.abs(end.y-start.y))+1;
  for(let i=0;i<len;i++){
    let x=start.x+dx*i, y=start.y+dy*i;
    if(x>=0&&x<gridSize&&y>=0&&y<gridSize) previewPath.push({x,y});
  }
}

function checkWord(){
  if(!start||!end) return;
  let dx=Math.sign(end.x-start.x), dy=Math.sign(end.y-start.y);
  let len=Math.max(Math.abs(end.x-start.x),Math.abs(end.y-start.y))+1;
  let letters="", path=[];
  for(let i=0;i<len;i++){
    let x=start.x+dx*i, y=start.y+dy*i;
    if(x<0||x>=gridSize||y<0||y>=gridSize) return;
    letters+=grid[y][x];
    path.push({x,y});
  }
  if(words.includes(letters)&&!foundWords.includes(letters)){
    foundWords.push(letters); foundPaths.push(path);
    score++; document.getElementById("score").innerText=`✅ Score: ${score}`;
    document.querySelector(`#wordItems li[data-word="${letters}"]`).classList.add("found");
    if(foundWords.length===words.length) gameEnd("🎉 You found all words!");
  } else {
    lives--; updateLives();
    if(lives<=0) gameEnd("💀 Game Over!");
  }
}

function updateLives(){
  document.getElementById("lives").innerText="❤️".repeat(lives);
}

function populateWordList(){
  let list=document.getElementById("wordItems");
  list.innerHTML="";
  words.forEach(w=>{
    let li=document.createElement("li");
    li.innerText=w; li.dataset.word=w;
    list.appendChild(li);
  });
}

function gameEnd(msg){
  clearInterval(interval);
  alert(msg);
  document.getElementById("restartBtn").style.display="inline-block";
}
