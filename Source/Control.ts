namespace Tsentris {
  import ƒ = FudgeCore;

  export interface Transformation {
    translation?: ƒ.Vector3;
    rotation?: ƒ.Vector3;
  }

  export interface Transformations {
    [keycode: string]: Transformation;
  }

  export interface Collision {
    element: GridElement;
    cube: Cube;
  }

  export class Control extends ƒ.Node {
    public static transformations: Transformations = Control.defineControls();
    private shape: Shape | undefined;
    private segment: number = 0;

    constructor() {
      super("Control");
      this.addComponent(new ƒ.ComponentTransform());
    }

    public static defineControls(): Transformations {
      let controls: Transformations = {};
      controls[ƒ.KEYBOARD_CODE.ARROW_UP] = { rotation: ƒ.Vector3.X(-90) };
      controls[ƒ.KEYBOARD_CODE.ARROW_DOWN] = { rotation: ƒ.Vector3.X(90) };
      controls[ƒ.KEYBOARD_CODE.ARROW_LEFT] = { rotation: ƒ.Vector3.Y(-90) };
      controls[ƒ.KEYBOARD_CODE.ARROW_RIGHT] = { rotation: ƒ.Vector3.Y(90) };
      controls[ƒ.KEYBOARD_CODE.W] = { translation: ƒ.Vector3.Y(1) };
      controls[ƒ.KEYBOARD_CODE.S] = { translation: ƒ.Vector3.Y(-1) };
      controls[ƒ.KEYBOARD_CODE.A] = { translation: ƒ.Vector3.X(-1) };
      controls[ƒ.KEYBOARD_CODE.D] = { translation: ƒ.Vector3.X(1) };
      controls[ƒ.KEYBOARD_CODE.SHIFT_LEFT] = controls[ƒ.KEYBOARD_CODE.SHIFT_RIGHT] = { translation: ƒ.Vector3.Y(1) };
      controls[ƒ.KEYBOARD_CODE.CTRL_LEFT] = controls[ƒ.KEYBOARD_CODE.CTRL_RIGHT] = { translation: ƒ.Vector3.Y(-1) };
      return controls;
    }

    public setShape(_shape: Shape): void {
      for (let child of this.getChildren())
        this.removeChild(child);
      this.appendChild(_shape);
      this.shape = _shape;
    }

    public move(_transformation: Transformation): void {
      this.mtxLocal.translate(_transformation.translation!);
      this.shape!.mtxLocal.rotate(_transformation.rotation!);
    }

    // public rotatePerspektive(_angle: number): void {
    //   this.mtxLocal.rotateY(_angle);
    //   this.shape!.mtxLocal.rotateY(-_angle, true);
    // }

    // public rotateToSegment(_segment: number): void {
    //   while (_segment != this.segment) {
    //     this.rotatePerspektive(-90);
    //     this.segment = ++this.segment % 4;
    //   }
    //   // console.log(this.mtxWorld.translation.toString());
    // }

    public checkCollisions(_transformation: Transformation): Collision[] {
      let save: ƒ.Mutator[] = [this.mtxLocal.getMutator(), this.shape!.mtxLocal.getMutator()];
      this.shape!.mtxLocal.rotate(_transformation.rotation!, true);
      this.mtxLocal.translate(_transformation.translation!);

      ƒ.Render.prepare(game);

      let collisions: Collision[] = [];
      for (let cube of this.shape!.getChildren()) {
        let element: GridElement = grid.pull(cube.mtxWorld.translation);
        if (element)
          collisions.push({ element: element, cube: (<Cube>cube) });
      }

      this.mtxLocal.mutate(save[0]);
      this.shape!.mtxLocal.mutate(save[1]);

      return collisions;
    }

    public dropFragment(): GridElement[] {
      let frozen: GridElement[] = [];
      for (let cube of this.shape!.getChildren()) {
        let position: ƒ.Vector3 = cube.mtxWorld.translation;
        cube.mtxLocal.translation = position;
        let element: GridElement = new GridElement(<Cube>cube);
        grid.push(position, element);
        frozen.push(element);
      }
      for (let child of this.getChildren())
        this.removeChild(child);
      return frozen;
    }

    public isConnected(): boolean {
      let neighbors: GridElement[] = [];
      let children: ƒ.Node[] = this.shape!.getChildren();
      for (let cube of children) {
        let found: GridElement[] = <GridElement[]>grid.findNeighbors(cube.mtxWorld.translation);
        neighbors.push(...found);
      }
      return neighbors.length > 0;
    }
  }
}
