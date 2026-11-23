export type Cell = { index: number; text: string; isMarked: boolean };

export function makeCells(
  itemPool: string[],
  gridSize: number,
  freeCenter: boolean,
): Cell[] {
  const shuffled = [...itemPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const center = Math.floor((gridSize * gridSize) / 2);
  return shuffled.slice(0, gridSize * gridSize).map((text, index) => {
    const isFree = freeCenter && index === center;
    return { index, text: isFree ? "FREE" : text, isMarked: isFree };
  });
}

export function winningCellIndexes(cells: Cell[], gridSize: number): Set<number> {
  const lines: number[][] = [];
  for (let i = 0; i < gridSize; i++) {
    lines.push(Array.from({ length: gridSize }, (_, j) => i * gridSize + j));
    lines.push(Array.from({ length: gridSize }, (_, j) => j * gridSize + i));
  }
  lines.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + i));
  lines.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + gridSize - 1 - i));
  const winning = new Set<number>();
  for (const line of lines) {
    if (line.every((index) => cells[index]?.isMarked === true)) {
      for (const index of line) winning.add(index);
    }
  }
  return winning;
}

export function hasBingo(cells: Cell[], gridSize: number): boolean {
  return winningCellIndexes(cells, gridSize).size > 0;
}
