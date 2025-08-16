# Wayang 🎭

A collaborative canvas application inspired by traditional Indonesian shadow puppetry (Wayang). Built with Next.js, TypeScript, and React hooks for real-time image manipulation and layer management.

## 🌟 Features

### Core Functionality
- **Dual Mode Interface**: Dalang (editor) and Viewer modes
- **Multi-Canvas Support**: Create and switch between multiple canvases
- **Layer Management**: Photoshop-like layer system with ordering and selection
- **Image Support**: Upload and manipulate JPG, PNG, GIF, and WebP files
- **Real-time Updates**: Live layer transformations and movements
- **Drag & Drop**: Intuitive layer positioning with visual feedback

### Tools & Interfaces
- **Modular Tool System**: Extensible component-based tool architecture
- **Mouse Modes**: Move and Pan tools for different interaction styles
- **Layer Controls**: Select, move, delete, and reorder layers
- **Canvas Management**: Custom canvas sizes and background colors
- **Visual Feedback**: Selection borders and status indicators

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd wayang
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### PowerShell Execution Policy (Windows)
If you encounter PowerShell execution policy errors, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📖 Usage Guide

### Getting Started
1. **Choose Your Mode**:
   - **Dalang**: Full editing capabilities with tools and layer management
   - **Viewer**: Read-only mode for viewing canvases

### Dalang Mode (/dalang)
2. **Create a Canvas**:
   - Click "+" in the Canvas panel (right sidebar)
   - Set width, height, and background color
   - Click "Create"

3. **Add Images**:
   - Click "Add Image" in the Tools panel (left sidebar)
   - Select JPG, PNG, GIF, or WebP files
   - Images appear as new layers on the canvas

4. **Manage Layers**:
   - View layers in the bottom panel
   - Click layers to select them
   - Delete layers with the trash icon
   - Selected layers show blue dashed borders

5. **Move Layers**:
   - Select "Move Tool" in the Tools panel
   - Click and drag layers around the canvas
   - Real-time position updates

6. **Switch Canvases**:
   - Use the Canvas panel (right sidebar) to switch between canvases
   - Each canvas maintains its own layers and settings

### Viewer Mode (/view)
- **View Only**: No editing tools available
- **Canvas Switching**: Browse between available canvases
- **Layer Information**: View layer details in the bottom info panel

## 🏗️ Architecture

### Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── dalang/            # Editor page
│   ├── view/              # Viewer page
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── tools/             # Modular tool components
│   ├── CanvasRenderer.tsx # Canvas rendering
│   ├── LayerPanel.tsx     # Layer management
│   └── ToolPanel.tsx      # Tool selection
├── hooks/                 # Custom React hooks
│   ├── useCanvas.ts       # Canvas state management
│   ├── useMouse.ts        # Mouse interactions
│   └── useImageUpload.ts  # Image handling
└── types/                 # TypeScript definitions
    └── core.ts            # Core classes and types
```

### Core Classes
```typescript
class Fraction {
  // Handles precise fractional calculations
  numerator: number;
  denominator: number;
  getFloat(): number;
  simplify(): void;
}

class Point {
  x: number;
  y: number;
}

class Layer {
  bottomLeft: Point;
  topRight: Point;
  layerOrder: number;
  id: string;
  oriWidth: number;
  oriHeight: number;
}

class ImageLayer extends Layer {
  srcPath: string;
}

class Canvas {
  width: number;
  height: number;
  bg: BackgroundConfig;
  layers: Layer[];
}
```

### Hook-Based Architecture
- **useCanvas**: Manages canvas state, layer operations, and canvas switching
- **useMouse**: Handles mouse interactions, collision detection, and drag operations
- **useImageUpload**: Manages file uploads and image layer creation

### Modular Tools
Each tool is a self-contained React component:
- `<Tool>` - Base component with consistent styling
- `<MoveTool>` - Layer movement functionality
- `<PanTool>` - Canvas panning (future feature)
- `<PaintBrushTool>` - Painting tools (coming soon)
- `<TextTool>` - Text layers (coming soon)
- `<ImageUploadTool>` - Image upload and management
- `<ShapeTool>` - Geometric shapes (coming soon)

## 🎨 Design Philosophy

### Wayang Inspiration
Named after traditional Indonesian shadow puppetry, Wayang represents:
- **Dalang**: The puppet master who controls the narrative
- **Layered Storytelling**: Multiple visual elements working together
- **Real-time Performance**: Live manipulation and interaction

### Technical Principles
- **Modularity**: Each feature is a self-contained, reusable component
- **Hook-Based**: Leverages React hooks for state management and side effects
- **Type Safety**: Full TypeScript implementation with strict typing
- **Performance**: Optimized with useCallback, useMemo, and proper re-render prevention
- **Extensibility**: Easy to add new tools, layer types, and features

## 🔧 Development

### Adding New Tools
1. Create a new component in `src/components/tools/`
2. Extend the base `<Tool>` component
3. Add tool-specific state and controls
4. Export from `src/components/tools/index.ts`
5. Import and use in `ToolPanel.tsx`

### Adding New Layer Types
1. Extend the base `Layer` class in `src/types/core.ts`
2. Update the `CanvasRenderer` to handle the new type
3. Add creation logic to relevant hooks
4. Update layer panel display logic

### State Management
The application uses a combination of:
- **Local State**: Component-specific state with useState
- **Custom Hooks**: Shared state logic with useCanvas, useMouse
- **Prop Drilling**: Intentional for explicit data flow
- **No Global State**: Keeps components modular and testable

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
```
Deploy to [Vercel Platform](https://vercel.com/new)

### Other Platforms
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by traditional Indonesian Wayang shadow puppetry
- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from Unicode emoji set
