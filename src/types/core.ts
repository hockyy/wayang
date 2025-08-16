export class Fraction {
  private denominator: number;
  private numerator: number;

  constructor(numerator: number, denominator: number) {
    this.numerator = numerator;
    this.denominator = denominator;
    this.simplify();
  }

  getFloat(): number {
    if (this.denominator === 0) return 0;
    return this.numerator / this.denominator;
  }

  private gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      [a, b] = [b, a % b];
    }
    return a;
  }

  private simplify(): void {
    const gcdValue = this.gcd(this.numerator, this.denominator);
    if (gcdValue === 0) {
      this.numerator = 0;
      this.denominator = 0;
      return;
    }
    
    this.numerator /= gcdValue;
    this.denominator /= gcdValue;
    
    const shouldNegative = (this.denominator < 0) || (this.denominator === 0 && this.numerator < 0);
    if (shouldNegative) {
      this.numerator = -this.numerator;
      this.denominator = -this.denominator;
    }
  }

  toString(): string {
    return `${this.numerator}/${this.denominator}`;
  }
}

export class Point {
  constructor(public x: number, public y: number) {}

  clone(): Point {
    return new Point(this.x, this.y);
  }

  equals(other: Point): boolean {
    return this.x === other.x && this.y === other.y;
  }
}

export class Layer {
  public bottomLeft: Point;
  public topRight: Point;
  public layerOrder: number;
  public id: string;
  public oriHeight: number;
  public oriWidth: number;

  constructor(
    bottomLeft: Point,
    topRight: Point,
    layerOrder: number,
    oriWidth: number,
    oriHeight: number
  ) {
    this.bottomLeft = bottomLeft;
    this.topRight = topRight;
    this.layerOrder = layerOrder;
    this.id = crypto.randomUUID();
    this.oriWidth = oriWidth;
    this.oriHeight = oriHeight;
  }

  getBottomRight(): Point {
    return new Point(this.topRight.x, this.bottomLeft.y);
  }

  getTopLeft(): Point {
    return new Point(this.bottomLeft.x, this.topRight.y);
  }

  getAspectRatio(): Fraction {
    return new Fraction(this.oriWidth, this.oriHeight);
  }

  getWidth(): number {
    return Math.abs(this.topRight.x - this.bottomLeft.x);
  }

  getHeight(): number {
    return Math.abs(this.topRight.y - this.bottomLeft.y);
  }

  // Check if a point is inside this layer (for collision detection)
  containsPoint(point: Point): boolean {
    const minX = Math.min(this.bottomLeft.x, this.topRight.x);
    const maxX = Math.max(this.bottomLeft.x, this.topRight.x);
    const minY = Math.min(this.bottomLeft.y, this.topRight.y);
    const maxY = Math.max(this.bottomLeft.y, this.topRight.y);
    
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }

  // Move the layer by offset
  move(offsetX: number, offsetY: number): void {
    this.bottomLeft.x += offsetX;
    this.bottomLeft.y += offsetY;
    this.topRight.x += offsetX;
    this.topRight.y += offsetY;
  }
}

export class ImageLayer extends Layer {
  public srcPath: string;

  constructor(
    bottomLeft: Point,
    topRight: Point,
    layerOrder: number,
    oriWidth: number,
    oriHeight: number,
    srcPath: string
  ) {
    super(bottomLeft, topRight, layerOrder, oriWidth, oriHeight);
    this.srcPath = srcPath;
  }
}

export class Canvas {
  public width: number;
  public height: number;
  public bg: BackgroundConfig;
  public id: string;
  public layers: Layer[];

  constructor(width: number, height: number, bg: BackgroundConfig) {
    this.width = width;
    this.height = height;
    this.bg = bg;
    this.id = crypto.randomUUID();
    this.layers = [];
  }

  getRatio(): Fraction {
    return new Fraction(this.width, this.height);
  }

  addLayer(layer: Layer): void {
    this.layers.push(layer);
    this.sortLayers();
  }

  removeLayer(layerId: string): void {
    this.layers = this.layers.filter(layer => layer.id !== layerId);
  }

  private sortLayers(): void {
    this.layers.sort((a, b) => a.layerOrder - b.layerOrder);
  }

  // Get the topmost layer at a given point
  getTopLayerAt(point: Point): Layer | null {
    // Iterate from highest layer order to lowest
    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (this.layers[i].containsPoint(point)) {
        return this.layers[i];
      }
    }
    return null;
  }
}

export interface BackgroundConfig {
  type: 'color' | 'image';
  color?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export type MouseMode = 'pan' | 'move' | 'zoom';

export interface Room {
  id: string;
  canvases: Canvas[];
  activeCanvasId: string;
}
