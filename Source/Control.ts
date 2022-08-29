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
    private shape: Shape | undefined;
    private segment: number = 0;

    constructor() {
      super("Control");
      this.addComponent(new ƒ.ComponentTransform());
    }

    public setShape(_shape: Shape): void {
      for (let child of this.getChildren())
        this.removeChild(child);
      this.appendChild(_shape);
      this.shape = _shape;
    }

    public move(_transformation: Transformation): void {
      this.mtxLocal.translate(_transformation.translation!);
      this.shape!.mtxLocal.rotate(_transformation.rotation!, true);
    }

    public checkCollisions(_transformation: Transformation): Collision[] {
      let save: ƒ.Mutator[] = [this.mtxLocal.getMutator(), this.shape!.mtxLocal.getMutator()];
      this.mtxLocal.translate(_transformation.translation!);
      this.shape!.mtxLocal.rotate(_transformation.rotation!, true);

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

    public dropShape(): GridElement[] {
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

    public checkOut(): boolean {
      let children: ƒ.Node[] = this.shape!.getChildren();
      let out: boolean = false;
      for (let cube of children)
        if (cube.mtxWorld.translation.magnitude > 5) {
          cube.getComponent(ƒ.ComponentMaterial).clrPrimary.a = 0.5;
          cube.mtxLocal.scaling = ƒ.Vector3.ONE(0.8);
          out ||= true;
        } else {
          cube.getComponent(ƒ.ComponentMaterial).clrPrimary.a = 1;
          cube.mtxLocal.scaling = ƒ.Vector3.ONE(1);
        }
      return out;
    }
  }
}
