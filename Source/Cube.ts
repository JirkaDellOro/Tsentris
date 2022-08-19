namespace Tsentris {
  import ƒ = FudgeCore;

  export enum CUBE_TYPE {
    GREEN = "Green",
    RED = "Red",
    BLUE = "Blue",
    YELLOW = "Yellow",
    MAGENTA = "Magenta",
    CYAN = "Cyan",
    BLACK = "Black"
  }

  export class Cube extends ƒ.Node {
    private static mesh: ƒ.MeshCube = new ƒ.MeshCube();
    private static material: ƒ.Material = new ƒ.Material("White", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("White", 0.9)));
    private static colors: Map<CUBE_TYPE, string> = new Map([
      [CUBE_TYPE.RED, "RED"],
      [CUBE_TYPE.GREEN, "LIME"],
      [CUBE_TYPE.BLUE, "BLUE"],
      [CUBE_TYPE.MAGENTA, "MAGENTA"],
      [CUBE_TYPE.YELLOW, "YELLOW"],
      [CUBE_TYPE.CYAN, "CYAN"],
      [CUBE_TYPE.BLACK, "GRAY"]
    ]);

    constructor(_type: CUBE_TYPE, _position: ƒ.Vector3) {

      super("Cube." + _type);

      let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(Cube.mesh);
      cmpMesh.mtxPivot.scale(ƒ.Vector3.ONE(0.9));
      this.addComponent(cmpMesh);

      let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(Cube.material);
      cmpMaterial.clrPrimary = ƒ.Color.CSS(Cube.colors.get(_type)!);
      cmpMaterial.sortForAlpha = true;
      this.addComponent(cmpMaterial);

      let cmpTransform: ƒ.ComponentTransform = new ƒ.ComponentTransform(ƒ.Matrix4x4.TRANSLATION(_position));
      this.addComponent(cmpTransform);
    }

    public getColor(): ƒ.Color {
      return this.getComponent(ƒ.ComponentMaterial).clrPrimary;
    }
  }
}