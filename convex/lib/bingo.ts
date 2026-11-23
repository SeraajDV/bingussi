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

export function hasBingo(cells: Cell[], gridSize: number): boolean {
  const marked = (row: number, column: number) =>
    cells[row * gridSize + column]?.isMarked === true;
  for (let i = 0; i < gridSize; i++) {
    if (
      Array.from({ length: gridSize }, (_, j) => marked(i, j)).every(Boolean) ||
      Array.from({ length: gridSize }, (_, j) => marked(j, i)).every(Boolean)
    ) return true;
  }
  return (
    Array.from({ length: gridSize }, (_, i) => marked(i, i)).every(Boolean) ||
    Array.from({ length: gridSize }, (_, i) => marked(i, gridSize - 1 - i)).every(Boolean)
  );
}
