namespace Tsentris {
  import ƒ = FudgeCore;

  export class Shape extends ƒ.Node {
    private static shapes: number[][][] = Shape.getShapeArray();
    public position: ƒ.Vector3 = new ƒ.Vector3(0, 0, 0);

    constructor(_shape: number, _position: ƒ.Vector3 = ƒ.Vector3.ZERO()) {
      super("Shape-Type" + _shape);
      let shape: number[][] = Shape.shapes[_shape];
      for (let position of shape) {
        let type: CUBE_TYPE;
        do {
          type = Shape.getRandomEnum(CUBE_TYPE);
        } while (type == CUBE_TYPE.BLACK);
        let vctPosition: ƒ.Vector3 = ƒ.Vector3.ZERO();
        vctPosition.set(position[0], position[1], position[2]);
        let cube: Cube = new Cube(type, vctPosition);
        this.appendChild(cube);
      }

      this.addComponent(new ƒ.ComponentTransform(ƒ.Matrix4x4.TRANSLATION(_position)));
    }

    public static getRandom(): Shape {
      let index: number = Math.floor(Math.random() * Shape.shapes.length);
      let shape: Shape = new Shape(index);
      return shape;
    }

    private static getShapeArray(): number[][][] {
      return [
        // Corner
        [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
        // Quad
        [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
        // S
        [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, -1, 0]],
        // T
        [[0, 0, 0], [0, 1, 0], [-1, 1, 0], [1, 1, 0]],
        // S twisted
        [[0, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1]],
        // S twisted reverse
        [[0, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, -1]],
        // L
        [[0, 0, 0], [0, 1, 0], [0, -1, 0], [1, -1, 0]],
        // I
        [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, -1, 0]]
      ];
    }

    private static getRandomEnum<T>(_enum: { [key: string]: T }): T {
      let randomKey: string = Object.keys(_enum)[Math.floor(Math.random() * Object.keys(_enum).length)];
      return _enum[randomKey];
    }
  }
}