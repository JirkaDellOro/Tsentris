namespace Tsentris {
  export import ƒ = FudgeCore;

  enum GAME_STATE {
    START, MENU, PLAY, OVER
  }

  window.addEventListener("load", hndLoad);

  export let game: ƒ.Node = new ƒ.Node("FudgeCraft");
  export let grid: Grid = new Grid();
  export let args: URLSearchParams;
  export let camera: CameraOrbit;
  export let points: Points;

  let state: GAME_STATE = GAME_STATE.START;
  let control: Control = new Control();
  let viewport: ƒ.Viewport;
  let speedCameraRotation: number = 0.2;
  let speedCameraTranslation: number = 0.02;

  function hndLoad(_event: Event): void {
    const canvas: HTMLCanvasElement = document.querySelector("canvas")!;
    args = new URLSearchParams(location.search);
    // ƒ.RenderManager.initialize(true, true);
    ƒ.Debug.log("Canvas", canvas);

    // enable unlimited mouse-movement (user needs to click on canvas first)
    canvas.addEventListener("click", canvas.requestPointerLock);

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

    // setup event handling
    // viewport.activatePointerEvent(ƒ.EVENT_POINTER.MOVE, true);
    // viewport.activateWheelEvent(ƒ.EVENT_WHEEL.WHEEL, true);
    viewport.canvas.addEventListener("mousemove", hndMouseMove);
    viewport.canvas.addEventListener("wheel", hndWheelMove);
    console.log(new ƒ.EventTouch(document));
    document.addEventListener(ƒ.EVENT_TOUCH.TAP, <EventListener>hndTouch);
    document.addEventListener(ƒ.EVENT_TOUCH.DOUBLE, <EventListener>hndTouch);
    document.addEventListener(ƒ.EVENT_TOUCH.MOVE, <EventListener>hndTouch);
    document.addEventListener(ƒ.EVENT_TOUCH.NOTCH, <EventListener>hndTouch);

    game.appendChild(control);

    if (args.get("test"))
      startTests();
    else
      start();

    updateDisplay();
    ƒ.Debug.log("Game", game);
  }

  function setState(_new: GAME_STATE): void {
    state = _new;
    ƒ.Debug.log("State", state);
  }

  async function start(): Promise<void> {
    setState(GAME_STATE.MENU);
    grid.push(ƒ.Vector3.ZERO(), new GridElement(new Cube(CUBE_TYPE.BLACK, ƒ.Vector3.ZERO())));
    startRandomFragment();
    ƒ.Debug.log("Wait for space");
    await waitForKeyPress(ƒ.KEYBOARD_CODE.SPACE);
    ƒ.Debug.log("Space pressed");
    let domMenu: HTMLElement = document.querySelector("div#Menu")!;
    domMenu.style.visibility = "hidden";
    window.addEventListener("keydown", hndKeyDown);  // activate when user starts...
    startCountDown();
    setState(GAME_STATE.PLAY);
  }

  function end(): void {
    let domOver: HTMLElement = document.querySelector("div#Over")!;
    domOver.style.visibility = "visible";
    window.removeEventListener("keydown", hndKeyDown);  // activate when user starts...
    setState(GAME_STATE.OVER);
  }

  async function waitForKeyPress(_code: ƒ.KEYBOARD_CODE): Promise<void> {
    return new Promise(_resolve => {
      window.addEventListener("keydown", hndEvent);
      window.addEventListener(ƒ.EVENT_TOUCH.LONG, hndEvent);
      function hndEvent(_event: KeyboardEvent | CustomEvent<ƒ.EventTouchDetail> | Event): void {
        if ((<KeyboardEvent>_event).code == _code || _event.type == ƒ.EVENT_TOUCH.LONG) {
          window.removeEventListener("keydown", hndEvent);
          window.removeEventListener(ƒ.EVENT_TOUCH.LONG, hndEvent);
          _resolve();
        }
      }
    });
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
      case ƒ.EVENT_TOUCH.MOVE:
        if (_event.detail.touches.length > 2) {
          camera.rotateY(-_event.detail.movement!.x * speedCameraRotation);
          camera.rotateX(-_event.detail.movement!.y * speedCameraRotation);
        }
        break;
      case ƒ.EVENT_TOUCH.NOTCH:
        if (_event.detail.touches.length > 2)
          break;

        let direction: ƒ.Vector3 = _event.detail.cardinal!.toVector3();
        direction.y *= -1;
        let transformation: Transformation = {};

        if (_event.detail.touches.length == 1)
          transformation = {
            translation: direction
          };
        else
          transformation = {
            rotation: new ƒ.Vector3(-90 * direction.y, 90 * direction.x, 0)
          }

        if (transformation != {})
          move(transformation);

        updateDisplay();
        break;

      case ƒ.EVENT_TOUCH.DOUBLE:
        dropShape();
        break;
      default:
        break;
    }
    updateDisplay();
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
    }

    let transformation: Transformation = {}; //  = Control.transformations[_event.code];
    if (ƒ.Keyboard.isPressedOne([ƒ.KEYBOARD_CODE.SHIFT_LEFT, ƒ.KEYBOARD_CODE.SHIFT_RIGHT, ƒ.KEYBOARD_CODE.CTRL_LEFT, ƒ.KEYBOARD_CODE.CTRL_RIGHT]))
      transformation = {
        rotation: new ƒ.Vector3(
          -90 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W], [ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S]),
          90 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D], [ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A]),
          0)
      };
    else
      transformation = {
        translation: new ƒ.Vector3(
          -1 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_LEFT, ƒ.KEYBOARD_CODE.A], [ƒ.KEYBOARD_CODE.ARROW_RIGHT, ƒ.KEYBOARD_CODE.D]),
          1 * ƒ.Keyboard.mapToTrit([ƒ.KEYBOARD_CODE.ARROW_UP, ƒ.KEYBOARD_CODE.W], [ƒ.KEYBOARD_CODE.ARROW_DOWN, ƒ.KEYBOARD_CODE.S]),
          0)
      };

    if (transformation != {})
      move(transformation);

    updateDisplay();
  }

  //#endregion

  //#region Start/Drop Fragments
  export function startRandomFragment(): void {
    let fragment: Shape = Shape.getRandom();
    let cardinals: ƒ.Vector3[] = Array.from(Grid.cardinals);
    control.mtxLocal.translation = ƒ.Vector3.ZERO();
    control.setShape(fragment);
    updateDisplay();
    let start: Transformation = {};
    try {
      do {
        let index: number = ƒ.random.getIndex(cardinals);
        let offset: ƒ.Vector3 = cardinals.splice(index, 1)[0];
        start = { translation: ƒ.Vector3.SCALE(offset, 5), rotation: ƒ.Vector3.ZERO() };
        // ƒ.Debug.log(control.checkCollisions(start).length );
      } while (control.checkCollisions(start).length > 0);
    } catch (_error) {
      callToAction("GAME OVER");
    }
    control.move(start);
    updateDisplay();
  }

  async function dropShape(): Promise<void> {
    if (!control.isConnected()) {
      callToAction("CONNECT TO EXISTING CUBES!");
      return;
    }
    points.clearCalc();

    let dropped: GridElement[] = control.dropFragment();
    let combos: Combos = new Combos(dropped);

    callToAction("CREATE COMBOS OF 3 OR MORE!");
    let iCombo: number = await handleCombos(combos, 0);
    if (iCombo > 0) {
      compressAndHandleCombos(iCombo);
      if (ƒ.random.getBoolean())
        callToAction("MULTIPLE COMBOS SCORE HIGHER!");
      else
        callToAction("LARGER COMBOS SCORE HIGHER!");
    }
    startRandomFragment();
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

    if (control.checkCollisions(move).length > 0)
      return;

    move.translation!.scale(1 / animationSteps);
    move.rotation!.scale(1 / animationSteps);

    ƒ.Time.game.setTimer(20, animationSteps, function (_event: ƒ.EventTimer): void {
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