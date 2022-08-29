namespace Tsentris {
  export import ƒ = FudgeCore;

  enum GAME_STATE {
    START, MENU, PLAY, OVER
  }

  window.addEventListener("load", hndLoad);

  export let game: ƒ.Node = new ƒ.Node("Tsentris");
  export let grid: Grid = new Grid();
  export let args: URLSearchParams;
  export let camera: CameraOrbit;
  export let points: Points;
  export let random: ƒ.Random = new ƒ.Random();;

  let state: GAME_STATE = GAME_STATE.START;
  let control: Control = new Control();
  let viewport: ƒ.Viewport;
  let speedCameraRotation: number = 0.2;
  let speedCameraTranslation: number = 0.02;
  let touchRotation: boolean = false;
  let touchEventDispatcher: ƒ.TouchEventDispatcher;
  let touchNotchTranslation: number = 40;
  let touchNotchRotation: number = 80;

  function hndLoad(_event: Event): void {
    const canvas: HTMLCanvasElement = document.querySelector("canvas")!;
    args = new URLSearchParams(location.search);

    // set lights
    let cmpLight: ƒ.ComponentLight = new ƒ.ComponentLight(new ƒ.LightDirectional(ƒ.Color.CSS("WHITE")));
    cmpLight.mtxPivot.lookAt(new ƒ.Vector3(0.5, -1, -0.8));
    // game.addComponent(cmpLight);
    let cmpLightAmbient: ƒ.ComponentLight = new ƒ.ComponentLight(new ƒ.LightAmbient(new ƒ.Color(0.25, 0.25, 0.25, 1)));
    game.addComponent(cmpLightAmbient);

    // setup orbiting camera
    camera = new CameraOrbit(75);
    game.appendChild(camera);
    camera.setRotationX(-20);
    camera.setRotationY(20);
    camera.cmpCamera.node!.addComponent(cmpLight);

    // setup viewport
    viewport = new ƒ.Viewport();
    viewport.initialize("Viewport", game, camera.cmpCamera, canvas);
    ƒ.Debug.log("Viewport", viewport);
    points = new Points(viewport, document.querySelector("#Score")!, document.querySelector("div#Calculation")!);

    document.querySelector("button")?.addEventListener("click", start);

    game.appendChild(control);
    grid.push(ƒ.Vector3.ZERO(), new GridElement(new Cube(CUBE_TYPE.BLACK, ƒ.Vector3.ZERO())));

    updateDisplay();
    ƒ.Debug.log("Game", game);
  }

  function setState(_new: GAME_STATE): void {
    state = _new;
    ƒ.Debug.log("State", state);
  }

  async function start(): Promise<void> {
    let seed: number = +document.querySelector("input")!.value;
    if (seed)
      random = new ƒ.Random(seed);
    setState(GAME_STATE.MENU);
    startRandomShape();
    let domMenu: HTMLElement = document.querySelector("div#Menu")!;
    domMenu.style.visibility = "hidden";

    // setup event handling
    document.addEventListener("keydown", hndKeyDown);  // activate when user starts...
    const canvas: HTMLCanvasElement = document.querySelector("canvas")!;
    // enable unlimited mouse-movement (user needs to click on canvas first)
    canvas.requestPointerLock();
    canvas.addEventListener("click", canvas.requestPointerLock);
    document.addEventListener("mousemove", hndMouseMove);
    document.addEventListener("wheel", hndWheelMove);
    document.addEventListener("click", hndClick);
    touchEventDispatcher = new ƒ.TouchEventDispatcher(document, 5, touchNotchTranslation);
    document.addEventListener(ƒ.EVENT_TOUCH.TAP, <EventListener>hndTouch);
    document.addEventListener(ƒ.EVENT_TOUCH.DOUBLE, <EventListener>hndTouch);
    document.addEventListener(ƒ.EVENT_TOUCH.MOVE, <EventListener>hndTouch);
    document.addEventListener(ƒ.EVENT_TOUCH.NOTCH, <EventListener>hndTouch);
    document.addEventListener(ƒ.EVENT_TOUCH.PINCH, <EventListener>hndTouch);

    startCountDown();
    setState(GAME_STATE.PLAY);
    audioInit();
    audioStartMusic();
  }

  async function end(): Promise<void> {
    const canvas: HTMLCanvasElement = document.querySelector("canvas")!;
    let domOver: HTMLElement = document.querySelector("div#Over")!;
    domOver.style.visibility = "visible";
    document.removeEventListener("keydown", hndKeyDown);
    canvas.removeEventListener("click", canvas.requestPointerLock);
    document.removeEventListener("click", hndClick);
    touchEventDispatcher.activate(false);
    document.exitPointerLock();

    setState(GAME_STATE.OVER);

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, 
      () => { camera.rotateY(0.5); updateDisplay(); }
    );
    ƒ.Loop.start();

    document.querySelector("button#restart")?.addEventListener("click", () => location.href = ".");
  }

  function startCountDown(): void {
    let countDown: ƒ.Time = new ƒ.Time();
    countDown.setTimer(1000, 0, showCountDown);
    function showCountDown(_event: ƒ.EventTimer): void {
      let time: number = 3 * 60 * 1000 - countDown.get();
      displayTime(time);
      if (time < 0) {
        countDown.clearAllTimers();
        displayTime(0);
        end();
      }
    }
  }

  function displayTime(_time: number): void {
    let units: ƒ.TimeUnits = ƒ.Time.getUnits(_time);
    let domTime: HTMLElement = document.querySelector("h1#Time")!;
    domTime.textContent = units.minutes!.toString().padStart(2, "0") + ":" + units.seconds!.toString().padStart(2, "0");
  }
  export function updateDisplay(): void {
    viewport.draw();
  }

  //#region Interaction
  function hndTouch(_event: CustomEvent<ƒ.EventTouchDetail>): void {
    _event.preventDefault();
    console.log(_event.type);
    if (ƒ.Time.game.hasTimers())
      return;

    switch (_event.type) {
      case ƒ.EVENT_TOUCH.TAP:
        touchRotation = !touchRotation;
        camera.cmpCamera.clrBackground = ƒ.Color.CSS(touchRotation ? "white" : "black");
        touchEventDispatcher.radiusNotch = touchRotation ? touchNotchRotation : touchNotchTranslation;
        break;
      case ƒ.EVENT_TOUCH.MOVE:
        if (_event.detail.touches.length > 1) {
          camera.rotateY(-_event.detail.movement!.x * speedCameraRotation);
          camera.rotateX(-_event.detail.movement!.y * speedCameraRotation);
        }
        break;
      case ƒ.EVENT_TOUCH.NOTCH:
        if (_event.detail.touches.length > 1)
          break;

        let direction: ƒ.Vector2 = _event.detail.cardinal!;
        let transformation: Transformation = {};

        if (touchRotation)
          transformation = {
            rotation: new ƒ.Vector3(90 * direction.y, 90 * direction.x, 0)
          }
        else
          transformation = {
            translation: new ƒ.Vector3(direction.x, -direction.y, 0)
          };

        if (transformation != {})
          move(transformation);

        updateDisplay();
        break;

      case ƒ.EVENT_TOUCH.DOUBLE:
        dropShape();
        break;

      case ƒ.EVENT_TOUCH.PINCH:
        camera.translate(-2 * _event.detail.pinchDelta! * speedCameraTranslation);
        break;

      default:
        break;
    }
    updateDisplay();
  }

  function hndClick(_event: MouseEvent): void {
    dropShape();
  }

  function hndMouseMove(_event: MouseEvent): void {
    camera.rotateY(_event.movementX * speedCameraRotation);
    camera.rotateX(_event.movementY * speedCameraRotation);

    updateDisplay();
  }

  function hndWheelMove(_event: WheelEvent): void {
    camera.translate(_event.deltaY * speedCameraTranslation);
    updateDisplay();
  }

  function hndKeyDown(_event: KeyboardEvent): void {
    if (ƒ.Time.game.hasTimers())
      return;

    if (_event.code == ƒ.KEYBOARD_CODE.SPACE) {
      dropShape();
      return;
    }

    let transformation: Transformation = {}; //  = Control.transformations[_event.code];
    if (ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.SHIFT_LEFT, ƒ.KEYBOARD_CODE.SHIFT_RIGHT, ƒ.KEYBOARD_CODE.CTRL_LEFT, ƒ.KEYBOARD_CODE.CTRL_RIGHT])) {
      let rotX: number = -90 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W], [ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S]);
      let rotY: number = 90 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D], [ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A]);
      transformation.rotation = new ƒ.Vector3(rotX, rotX == 0 ? rotY : 0, 0);
      if (rotX == 0 && rotY == 0)
        return;
    }
    else
      transformation.translation = new ƒ.Vector3(
        -1 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A], [ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D]),
        1 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W], [ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S]),
        0);

    if (transformation != {})
      move(transformation);

    updateDisplay();
  }

  //#endregion

  //#region Start/Drop Shapes
  export function startRandomShape(): void {
    let shape: Shape = Shape.getRandomShape();
    let cardinals: ƒ.Vector3[] = Array.from(Grid.cardinals);
    control.mtxLocal.translation = ƒ.Vector3.ZERO();
    control.setShape(shape);
    updateDisplay();

    let start: Transformation = {};
    do {
      //try to find a position for the new shape, DANGER: potential endless loop
      let offset: ƒ.Vector3;
      do
        offset = new ƒ.Vector3(random.getRangeFloored(-1, 2), random.getRangeFloored(-1, 2), random.getRangeFloored(-1, 2))
      while (offset.equals(ƒ.Vector3.ZERO()));

      let scale: number = Math.round(5 / offset.magnitude);
      start = { translation: ƒ.Vector3.SCALE(offset, scale), rotation: ƒ.Vector3.ZERO() };
    } while (control.checkCollisions(start).length > 0);

    control.move(start);
    control.checkOut();
    updateDisplay();
  }

  async function dropShape(): Promise<void> {
    if (control.checkOut()) {
      callToAction("BRING SHAPE CLOSER IN!");
      audioEffect("nodrop");
      return;
    }

    if (!control.isConnected()) {
      callToAction("CONNECT TO EXISTING CUBES!");
      audioEffect("nodrop");
      return;
    }
    
   

    points.clearCalc();

    let dropped: GridElement[] = control.dropShape();
    let combos: Combos = new Combos(dropped);

    callToAction("CREATE COMBOS OF 3 OR MORE!");
    let iCombo: number = await handleCombos(combos, 0);
    if (iCombo > 0) {
      compressAndHandleCombos(iCombo);
      if (random.getBoolean())
        callToAction("MULTIPLE COMBOS SCORE HIGHER!");
      else
        callToAction("LARGER COMBOS SCORE HIGHER!");
    }
    else
      audioEffect("drop");

    startRandomShape();
    updateDisplay();
  }
  //#endregion

  //#region Combos & Compression
  export async function compressAndHandleCombos(_iCombo: number): Promise<void> {
    let moves: Move[];
    let iCombo: number = _iCombo;
    do {
      moves = compress();
      await ƒ.Time.game.delay(400);

      let moved: GridElement[] = moves.map(_move => _move.element);
      let combos: Combos = new Combos(moved);
      let iCounted: number = await handleCombos(combos, iCombo);
      iCombo += iCounted;
    } while (moves.length > 0);
  }

  export async function handleCombos(_combos: Combos, _iCombo: number): Promise<number> {
    let iCombo: number = 0;
    for (let combo of _combos.found)
      if (combo.length > 2) {
        iCombo++;
        audioCombo(_iCombo + iCombo);
        points.showCombo(combo, _iCombo + iCombo);
        for (let shrink: number = Math.PI - Math.asin(0.9); shrink >= 0; shrink -= 0.2) {
          for (let element of combo) {
            let mtxLocal: ƒ.Matrix4x4 = element.cube.mtxLocal;
            mtxLocal.scaling = ƒ.Vector3.ONE(Math.sin(shrink) * 1.2);
          }
          updateDisplay();
          await ƒ.Time.game.delay(20);
        }
        for (let element of combo)
          grid.pop(element.position!);
      }
    updateDisplay();
    return iCombo;
  }

  function move(_transformation: Transformation): void {
    let animationSteps: number = 5;

    let mtxControl: ƒ.Matrix4x4 = camera.getControlMatrix();
    let move: Transformation = {
      rotation: _transformation.rotation ? ƒ.Vector3.TRANSFORMATION(_transformation.rotation, mtxControl) : new ƒ.Vector3(),
      translation: _transformation.translation ? ƒ.Vector3.TRANSFORMATION(_transformation.translation, mtxControl) : new ƒ.Vector3()
    };

    if (control.checkCollisions(move).length > 0) {
      audioEffect("collision")
      return;
    }

    control.checkOut();

    if (_transformation.translation)
      audioEffect("translate");
    if (_transformation.rotation)
      audioEffect("rotate");

    move.translation!.scale(1 / animationSteps);
    move.rotation!.scale(1 / animationSteps);

    ƒ.Time.game.setTimer(10, animationSteps, function (_event: ƒ.EventTimer): void {
      control.move(move);
      updateDisplay();
    });
  }

  export function compress(): Move[] {
    let moves: Move[] = grid.compress();

    for (let move of moves) {
      grid.pop(move.element.position!);
      grid.push(move.target, move.element);
    }

    let animationSteps: number = 5;
    ƒ.Time.game.setTimer(20, animationSteps, function (_event: ƒ.EventTimer): void {
      for (let move of moves) {
        let translation: ƒ.Vector3 = ƒ.Vector3.DIFFERENCE(move.target, move.element.position!);
        translation.normalize(1 / animationSteps);
        move.element.position = ƒ.Vector3.SUM(move.element.position!, translation);
        if (_event.lastCall)
          move.element.position = move.target;

      }
      updateDisplay();
    });

    return moves;
  }
  //#endregion

  function callToAction(_message: string): void {
    let span: HTMLElement = document.querySelector("span#CallToAction")!;
    span.textContent = _message;
    span.style.animation = "none";
    isNaN(span.offsetHeight); // stupid hack to restart css-animation, read offsetHeight
    span.style.animation = "";
  }
}