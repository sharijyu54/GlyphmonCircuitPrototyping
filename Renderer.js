export class CoordMapper {
  constructor({ cols, rows, cellSize, margin }) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.margin = margin;
  }
  toCanvas(px, py) {
    const { rows, cellSize, margin } = this;
    const x0 = margin;
    const cx = x0 + px * cellSize + cellSize / 2;
    const yOutput = margin;
    const yGrid = yOutput + cellSize;
    const yInput = yGrid + rows * cellSize;
    const yStack = yInput + cellSize;
    if (py === rows + 1 || py === rows) return { x: cx, y: yInput + cellSize / 2 };
    if (py < 0) return { x: cx, y: yOutput + cellSize / 2 };
    if (py > rows) return { x: cx, y: yStack + cellSize / 2 };
    return { x: cx, y: yGrid + py * cellSize + cellSize / 2 };
  }
}

export class PathService {
  constructor({ cols, rows, arrowDirs, coord }) {
    this.cols = cols;
    this.rows = rows;
    this.arrowDirs = arrowDirs;
    this.coord = coord;
  }
  simulate(grid, startX) {
    const { rows, cols, arrowDirs, coord } = this;
    const pts = [];
    let cx = startX, cy = rows;
    let dir = { dx: 0, dy: -1 };
    const visited = new Set();
    const maxSteps = cols * rows * 2;
    const addPoint = (x, y) => {
      const p = coord.toCanvas(x, y);
      const last = pts[pts.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) pts.push(p);
    };
    addPoint(cx, cy);
    for (let i = 0; i < maxSteps; i++) {
      const state = `${cx},${cy},${dir.dx},${dir.dy}`;
      if (visited.has(state)) break;
      visited.add(state);
      const nx = cx + dir.dx, ny = cy + dir.dy;
      addPoint(nx, ny);
      cx = nx; cy = ny;
      if (cy < 0 || cy > rows || cx < 0 || cx >= cols) break;
      if (cy === rows) { dir = { dx: 0, dy: -1 }; continue; }
      const cell = grid[cy][cx];
      const d = cell && arrowDirs[cell.arrow];
      if (d) dir = d;
    }
    return pts;
  }
}

export class Renderer {
  constructor({ canvas, config, services = {} }) {
    this.ctx = canvas.getContext('2d');
    this.cfg = config;
    this.coord = services.coord ?? new CoordMapper(config);
    this.path = services.path ?? new PathService({
      ...config,
      arrowDirs: services.arrowDirs,
      coord: this.coord,
    });
  }
  render(state) {
    const { ctx, cfg, coord, path } = this;
    const { grid, signals, inputStack = [] } = state;
    const { cols, rows, cellSize, margin } = cfg;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // bands
    const x0 = margin, yOutput = margin, yGrid = yOutput + cellSize, yInput = yGrid + rows * cellSize;
    ctx.fillStyle = "rgba(255,70,70,0.1)";
    ctx.fillRect(x0, yOutput, cols * cellSize, cellSize);
    ctx.fillStyle = "rgba(90,160,255,0.1)";
    ctx.fillRect(x0, yInput, cols * cellSize, cellSize);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      const y = yGrid + r * cellSize + .5;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + cols * cellSize, y); ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      const x = x0 + c * cellSize + .5;
      ctx.beginPath(); ctx.moveTo(x, yGrid); ctx.lineTo(x, yGrid + rows * cellSize); ctx.stroke();
    }

    // cells
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.max(16, cellSize * 0.45)}px monospace`;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      const cx = x0 + x * cellSize + cellSize / 2;
      const cy = yGrid + y * cellSize + cellSize / 2;
      if (cell.arrow) { ctx.fillStyle = "#f8f8ff"; ctx.fillText(cell.arrow, cx, cy); }
      if (cell.element) {
        const baseFont = ctx.font;
        if (cell.element.startsWith('pause')) {
          const radius = cellSize * 0.38;
          ctx.fillStyle = "#3f7cff"; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = 'bold ' + Math.max(14, cellSize * 0.4) + 'px monospace'; ctx.fillText('⏸', cx, cy - 6);
          ctx.font = 'bold ' + Math.max(10, cellSize * 0.3) + 'px monospace'; ctx.fillText(cell.element.slice(5), cx, cy + 8);
        } else {
          const size = cellSize * 0.5;
          ctx.fillStyle = "#ffd54f"; ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          ctx.fillStyle = "#111"; ctx.fillText(cell.element === 'sync' ? 'S' : '#', cx, cy);
        }
        ctx.font = baseFont;
      }
    }

    // path preview
    ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(160,160,170,0.5)";
    for (let x = 0; x < cols; x++) {
      const pts = path.simulate(grid, x);
      if (pts.length < 2) continue;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // signals
    for (const s of [...signals, ...inputStack]) {
      if (!s.active && !s.paused) continue;
      const p = coord.toCanvas(s.x, s.y);
      ctx.beginPath();
      ctx.fillStyle = `rgb(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]})`;
      ctx.arc(p.x, p.y, cellSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
      if (s.number != null) {
        ctx.fillStyle = "#111";
        ctx.font = "bold " + Math.max(14, cellSize * 0.35) + "px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(s.number), p.x, p.y);
      }
    }
  }
}

