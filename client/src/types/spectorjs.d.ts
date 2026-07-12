declare module 'spectorjs' {
  export class Spector {
    constructor();
    displayUI(): void;
    hideUI(): void;
    spyCanvas(canvas: HTMLCanvasElement): void;
    captureNextFrame(): void;
    onCapture: { add(callback: (capture: any) => void): void };
  }
}
