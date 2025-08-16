import { HANDLE_SIZE } from '@/constants/ui';

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

  // Resize the layer by updating corner positions
  resize(newBottomLeft: Point, newTopRight: Point, maintainAspectRatio: boolean = false): void {
    if (maintainAspectRatio) {
      const originalAspectRatio = this.getAspectRatio().getFloat();
      const newWidth = Math.abs(newTopRight.x - newBottomLeft.x);
      const newHeight = Math.abs(newTopRight.y - newBottomLeft.y);
      const newAspectRatio = newWidth / newHeight;
      
      // Adjust dimensions to maintain aspect ratio
      if (newAspectRatio > originalAspectRatio) {
        // Width is too large, adjust it
        const adjustedWidth = newHeight * originalAspectRatio;
        if (newBottomLeft.x < newTopRight.x) {
          newTopRight.x = newBottomLeft.x + adjustedWidth;
        } else {
          newBottomLeft.x = newTopRight.x + adjustedWidth;
        }
      } else if (newAspectRatio < originalAspectRatio) {
        // Height is too large, adjust it
        const adjustedHeight = newWidth / originalAspectRatio;
        if (newBottomLeft.y < newTopRight.y) {
          newTopRight.y = newBottomLeft.y + adjustedHeight;
        } else {
          newBottomLeft.y = newTopRight.y + adjustedHeight;
        }
      }
    }
    
    this.bottomLeft = newBottomLeft;
    this.topRight = newTopRight;
  }

  // Get resize handle positions for hit detection
  getResizeHandles(): { topLeft: Point; topRight: Point; bottomLeft: Point; bottomRight: Point } {
    const x = Math.min(this.bottomLeft.x, this.topRight.x);
    const y = Math.min(this.bottomLeft.y, this.topRight.y);
    const width = this.getWidth();
    const height = this.getHeight();
    
    return {
      topLeft: new Point(x, y),
      topRight: new Point(x + width, y),
      bottomLeft: new Point(x, y + height),
      bottomRight: new Point(x + width, y + height),
    };
  }

  // Check if a point is near a resize handle
  // Returns handle index: 0=topLeft, 1=topRight, 2=bottomRight, 3=bottomLeft
  getHandleAt(point: Point, tolerance: number = HANDLE_SIZE): number | null {
    const handles = this.getResizeHandles();
    const handleSize = tolerance;
    const handlePositions = [
      handles.topLeft,     // 0
      handles.topRight,    // 1
      handles.bottomRight, // 2
      handles.bottomLeft,  // 3
    ];
    
    for (let i = 0; i < handlePositions.length; i++) {
      const handlePos = handlePositions[i];
      if (
        point.x >= handlePos.x - handleSize / 2 &&
        point.x <= handlePos.x + handleSize / 2 &&
        point.y >= handlePos.y - handleSize / 2 &&
        point.y <= handlePos.y + handleSize / 2
      ) {
        return i;
      }
    }
    
    return null;
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
    console.log(layer);
    console.log("adding layer");
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
    console.log('No layer found at point:', point);
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

export type MouseMode = 'pan' | 'move' | 'zoom' | 'resize';

export interface Room {
  id: string;
  canvases: Canvas[];
  activeCanvasId: string;
}
