export type Measure = (text: string) => number;
export function wrapText(text: string, width: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (measure(word) > width) {
        if (line) { lines.push(line); line = ''; }
        for (const char of Array.from(word)) {
          if (measure(char) > width) throw new Error('A character is wider than its text region.');
          if (line && measure(line + char) > width) { lines.push(line); line = ''; }
          line += char;
        }
      } else if (line && measure(line + ' ' + word) > width) { lines.push(line); line = word; }
      else line = line ? line + ' ' + word : word;
    }
    lines.push(line);
  }
  return lines;
}
export function coverCrop(width: number, height: number, targetWidth: number, targetHeight: number, x=0.5, y=0.5, zoom=1): [number, number, number, number] {
  if (![width,height,targetWidth,targetHeight,x,y,zoom].every(Number.isFinite) || Math.min(width, height, targetWidth, targetHeight) <= 0 || x<0 || x>1 || y<0 || y>1 || zoom<1 || zoom>4) throw new Error('Invalid artwork dimensions or position');
  const scale = Math.max(targetWidth / width, targetHeight / height);
  const cropWidth = targetWidth / scale / zoom, cropHeight = targetHeight / scale / zoom;
  return [(width - cropWidth) * x, (height - cropHeight) * y, cropWidth, cropHeight];
}
