import { Renderer } from './Renderer.js';

const cols=9,rows=9,cellSize=32;
const tickInterval=500, rollingWindowSec=10;
let last = performance.now();
let accumulated = 0;
let running = true;

const canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d");
const BOARD_MARGIN=40;
canvas.width=cols*cellSize+BOARD_MARGIN*2;
canvas.height=(rows+3)*cellSize+BOARD_MARGIN*2;
const scoreEl=document.getElementById("score");

const ARROWS=['↑','→','↓','←',null];
const ARROW_DIRS={'→':{dx:1,dy:0},'↓':{dx:0,dy:1},'←':{dx:-1,dy:0},'↑':{dx:0,dy:-1}};
const grid=Array.from({length:rows},()=>Array.from({length:cols},()=>({arrow:null,element:null})));
const renderer = new Renderer({
  canvas,
  config: { cols, rows, cellSize, margin: BOARD_MARGIN },
  services: { arrowDirs: ARROW_DIRS }
});
function renderFrame(){
  renderer.render({ grid, signals, inputStack });
}

const COLORS={red:{rgb:[255,70,70],v:-1},green:{rgb:[80,255,150],v:+1},blue:{rgb:[90,160,255],v:+1.5}};
const signals=[],scoreLog=[];
class Signal{
  constructor({x=0,y=0,color='red',number=1}){
    this.x=x;
    this.y=y;
    this.lastMove=0;
    this.active=true;
    this.number=number;
    this.vx=0;
    this.vy=-1;
    this.pauseTimer=0;
    this.color=color;
  }
  set color(name){
    const preset=COLORS[name];
    if(!preset)throw new Error(`Unknown color: ${name}`);
    this._color=name;
    this.rgb=preset.rgb.slice();
    this.v=preset.v;
  }
  get color(){
    return this._color;
  }
}

let inputStack=[]; // 左詰めで3つまで
function now(){return performance.now();}

/* syncシステム */
const pausedSyncSignals=[];
function onSyncHit(sig){
  if(pausedSyncSignals.length===0){sig.active=false;pausedSyncSignals.push(sig);return 'paused';}
  else{while(pausedSyncSignals.length){const s=pausedSyncSignals.pop();s.active=true;s.paused=false;}return'released';}
}

/* 移動 */
function applyElementsAndMoveInCell(cell,sig){
  if(cell.element==='#'&&sig.color==='red'){
    sig.color='blue';
  }
  const pauseMatch=cell.element&&cell.element.startsWith('pause')?Number(cell.element.slice(5)):null;
  if(pauseMatch){
    if (sig.pauseTimer<=0)
    {
      sig.pauseTimer=pauseMatch;
    }
    else {
      sig.pauseTimer--;
    }
  }
  if(cell.arrow){
    const d=ARROW_DIRS[cell.arrow];
    if(d){sig.vx=d.dx;sig.vy=d.dy;}
  }
  if (sig.pauseTimer<=0)
  {
    sig.x+=sig.vx;
    sig.y+=sig.vy;
  }
}
function move(sig){
  if(sig.y>=0&&sig.y<rows&&sig.x>=0&&sig.x<cols){
    const c=grid[sig.y][sig.x];
    applyElementsAndMoveInCell(c,sig);
  }else{
    sig.x+=sig.vx;
    sig.y+=sig.vy;
  }
  if(sig.pauseCell&&(sig.x!==sig.pauseCell.x||sig.y!==sig.pauseCell.y))sig.pauseCell=null;
  if(sig.x<0||sig.x>=cols||sig.y>rows||sig.y<-1){sig.active=false;}
}

  function spawnSignal(){
  const c=['red','green','blue'][Math.floor(Math.random()*3)];
  const num=Math.floor(Math.random()*9)+1;
  if(inputStack.length<3){
    inputStack.push(new Signal({x:inputStack.length,y:rows,color:c,number:num}));
  }
}

// called when input stack overflow
function checkInputStackRelease(){
  if(inputStack.length===3){
    // 3つ集まったら全て上に移動
    for(let i=0;i<3;i++){
      const s=inputStack[i];
      s.y=rows-1; // input laneへ
      s.x=i;    // 左詰め
      s.vx=0;
      s.vy=-1;
      signals.push(s);
    }
    inputStack=[];
  }
}

// update logic
function update(){
  for (const s of signals) move(s);
  // spawn signals
  spawnSignal();
  checkInputStackRelease();
}

// 矢印クリック
canvas.addEventListener("click",e=>{
  const r=canvas.getBoundingClientRect(),mx=(e.clientX-r.left)*canvas.width/r.width,my=(e.clientY-r.top)*canvas.height/r.height;
  const x0=BOARD_MARGIN,yGrid=BOARD_MARGIN+cellSize;
  if(mx>=x0&&mx<x0+cols*cellSize&&my>=yGrid&&my<yGrid+rows*cellSize){
    const gx=Math.floor((mx-x0)/cellSize),gy=Math.floor((my-yGrid)/cellSize);
    grid[gy][gx].arrow=ARROWS[(ARROWS.indexOf(grid[gy][gx].arrow)+1)%ARROWS.length];
  }
});
// D&D
const tools=document.querySelectorAll(".tool");
tools.forEach(t=>t.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",t.dataset.item)));
canvas.addEventListener("dragover",e=>e.preventDefault());
canvas.addEventListener("drop",e=>{
  e.preventDefault();const item=e.dataTransfer.getData("text/plain");
  const r=canvas.getBoundingClientRect(),mx=(e.clientX-r.left)*canvas.width/r.width,my=(e.clientY-r.top)*canvas.height/r.height;
  const x0=BOARD_MARGIN,yGrid=BOARD_MARGIN+cellSize;
  if(mx>=x0&&mx<x0+cols*cellSize&&my>=yGrid&&my<yGrid+rows*cellSize){
    const gx=Math.floor((mx-x0)/cellSize),gy=Math.floor((my-yGrid)/cellSize);grid[gy][gx].element=item;
  }
});

function frame(now){
  accumulated += now - last;
  last = now;

  while (accumulated >= tickInterval) {
    update();
    accumulated -= tickInterval;
  }
 renderFrame();

  if (running) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);