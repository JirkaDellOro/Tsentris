"use strict";
var Tsentris;
(function (Tsentris) {
    var ƒ = FudgeCore;
    class CameraOrbit extends ƒ.Node {
        maxRotX = 75;
        minDistance = 10;
        constructor(_maxRotX) {
            super("CameraOrbit");
            this.maxRotX = Math.min(_maxRotX, 89);
            let cmpTransform = new ƒ.ComponentTransform();
            this.addComponent(cmpTransform);
            let rotatorX = new ƒ.Node("CameraRotX");
            rotatorX.addComponent(new ƒ.ComponentTransform());
            this.appendChild(rotatorX);
            let cmpCamera = new ƒ.ComponentCamera();
            // cmpCamera.backgroundColor = new ƒ.Color(1, 1, 1, 1);
            cmpCamera.clrBackground = ƒ.Color.CSS("WHITE");
            rotatorX.addComponent(cmpCamera);
            cmpCamera.mtxPivot.rotateY(180);
            this.setDistance(20);
        }
        get cmpCamera() {
            return this.rotatorX.getComponent(ƒ.ComponentCamera);
        }
        get rotatorX() {
            return this.getChildrenByName("CameraRotX")[0];
        }
        setDistance(_distance) {
            let newDistance = Math.max(this.minDistance, _distance);
            this.cmpCamera.mtxPivot.translation = ƒ.Vector3.Z(newDistance);
        }
        getDistance() {
            return this.cmpCamera.mtxPivot.translation.z;
        }
        moveDistance(_delta) {
            this.setDistance(this.cmpCamera.mtxPivot.translation.z + _delta);
        }
        setRotationY(_angle) {
            this.mtxLocal.rotation = ƒ.Vector3.Y(_angle);
        }
        setRotationX(_angle) {
            _angle = Math.min(Math.max(-this.maxRotX, _angle), this.maxRotX);
            this.rotatorX.mtxLocal.rotation = ƒ.Vector3.X(_angle);
        }
        rotateY(_delta) {
            this.mtxLocal.rotateY(_delta);
        }
        rotateX(_delta) {
            let angle = this.rotatorX.mtxLocal.rotation.x + _delta;
            this.setRotationX(angle);
        }
        translate(_delta) {
            let distance = this.cmpCamera.mtxPivot.translation.z + _delta;
            this.setDistance(distance);
        }
        getControlMatrix() {
            let view = this.rotatorX.mtxWorld.getZ();
            let sorted = [["X", view.x], ["Y", view.y], ["Z", view.z]];
            sorted.sort((_a, _b) => Math.abs(Number(_a[1])) > Math.abs(Number(_b[1])) ? -1 : 1);
            let result = sorted.map(_element => (_element[1] > 0 ? "+" : "-") + _element[0]);
            // console.log(result);
            let control = ƒ.Matrix4x4.IDENTITY();
            let rotY = result[0];
            if (result[0].charAt(1) == "Y")
                rotY = result[1];
            switch (rotY) {
                case "-Z":
                    control.rotateY(180);
                    break;
                case "+X":
                    control.rotateY(90);
                    break;
                case "-X":
                    control.rotateY(-90);
                    break;
            }
            if (result[0].charAt(1) == "Y")
                if (result[0] == "-Y")
                    control.rotateX(90);
                else
                    control.rotateX(-90);
            return control;
        }
    }
    Tsentris.CameraOrbit = CameraOrbit;
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    class Combos {
        found = [];
        constructor(_elements) {
            this.detect(_elements);
        }
        detect(_elements) {
            for (let element of _elements) {
                if (this.contains(element))
                    continue;
                let combo = [];
                combo.push(element);
                this.recurse(element, combo);
                this.found.push(combo);
            }
        }
        contains(_element) {
            for (let combo of this.found)
                for (let element of combo)
                    if (element == _element)
                        return true;
            return false;
        }
        recurse(_element, _combo) {
            let matches = this.findNeighborsOfSameColor(_element);
            for (let iMatch = matches.length - 1; iMatch >= 0; iMatch--) {
                let match = matches[iMatch];
                let iCombo = _combo.indexOf(match);
                if (iCombo >= 0)
                    matches.splice(iMatch, 1);
                else
                    _combo.push(match);
            }
            for (let match of matches)
                this.recurse(match, _combo);
        }
        findNeighborsOfSameColor(_element) {
            let allNeighbors = Tsentris.grid.findNeighbors(_element.position);
            let found = allNeighbors.filter(_neighbor => (_neighbor.cube.name == _element.cube.name));
            return found;
        }
    }
    Tsentris.Combos = Combos;
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    var ƒ = FudgeCore;
    class Control extends ƒ.Node {
        shape;
        segment = 0;
        constructor() {
            super("Control");
            this.addComponent(new ƒ.ComponentTransform());
        }
        setShape(_shape) {
            for (let child of this.getChildren())
                this.removeChild(child);
            this.appendChild(_shape);
            this.shape = _shape;
        }
        move(_transformation) {
            this.mtxLocal.translate(_transformation.translation);
            this.shape.mtxLocal.rotate(_transformation.rotation, true);
        }
        checkCollisions(_transformation) {
            let save = [this.mtxLocal.getMutator(), this.shape.mtxLocal.getMutator()];
            this.mtxLocal.translate(_transformation.translation);
            this.shape.mtxLocal.rotate(_transformation.rotation, true);
            ƒ.Render.prepare(Tsentris.game);
            let collisions = [];
            for (let cube of this.shape.getChildren()) {
                let element = Tsentris.grid.pull(cube.mtxWorld.translation);
                if (element)
                    collisions.push({ element: element, cube: cube });
            }
            this.mtxLocal.mutate(save[0]);
            this.shape.mtxLocal.mutate(save[1]);
            return collisions;
        }
        dropFragment() {
            let frozen = [];
            for (let cube of this.shape.getChildren()) {
                let position = cube.mtxWorld.translation;
                cube.mtxLocal.translation = position;
                let element = new Tsentris.GridElement(cube);
                Tsentris.grid.push(position, element);
                frozen.push(element);
            }
            for (let child of this.getChildren())
                this.removeChild(child);
            return frozen;
        }
        isConnected() {
            let neighbors = [];
            let children = this.shape.getChildren();
            for (let cube of children) {
                let found = Tsentris.grid.findNeighbors(cube.mtxWorld.translation);
                neighbors.push(...found);
            }
            return neighbors.length > 0;
        }
    }
    Tsentris.Control = Control;
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    var ƒ = FudgeCore;
    let CUBE_TYPE;
    (function (CUBE_TYPE) {
        CUBE_TYPE["GREEN"] = "Green";
        CUBE_TYPE["RED"] = "Red";
        CUBE_TYPE["BLUE"] = "Blue";
        CUBE_TYPE["YELLOW"] = "Yellow";
        CUBE_TYPE["MAGENTA"] = "Magenta";
        CUBE_TYPE["CYAN"] = "Cyan";
        CUBE_TYPE["BLACK"] = "Black";
    })(CUBE_TYPE = Tsentris.CUBE_TYPE || (Tsentris.CUBE_TYPE = {}));
    class Cube extends ƒ.Node {
        static mesh = new ƒ.MeshCube();
        static material = new ƒ.Material("White", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("White", 0.9)));
        static colors = new Map([
            [CUBE_TYPE.RED, "RED"],
            [CUBE_TYPE.GREEN, "LIME"],
            [CUBE_TYPE.BLUE, "BLUE"],
            [CUBE_TYPE.MAGENTA, "MAGENTA"],
            [CUBE_TYPE.YELLOW, "YELLOW"],
            [CUBE_TYPE.CYAN, "CYAN"],
            [CUBE_TYPE.BLACK, "BLACK"]
        ]);
        constructor(_type, _position) {
            super("Cube." + _type);
            let cmpMesh = new ƒ.ComponentMesh(Cube.mesh);
            cmpMesh.mtxPivot.scale(ƒ.Vector3.ONE(0.9));
            this.addComponent(cmpMesh);
            let cmpMaterial = new ƒ.ComponentMaterial(Cube.material);
            cmpMaterial.clrPrimary = ƒ.Color.CSS(Cube.colors.get(_type));
            cmpMaterial.sortForAlpha = true;
            this.addComponent(cmpMaterial);
            let cmpTransform = new ƒ.ComponentTransform(ƒ.Matrix4x4.TRANSLATION(_position));
            this.addComponent(cmpTransform);
        }
        getColor() {
            return this.getComponent(ƒ.ComponentMaterial).clrPrimary;
        }
    }
    Tsentris.Cube = Cube;
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    var ƒ = FudgeCore;
    class GridElement {
        cube;
        constructor(_cube) {
            this.cube = _cube;
        }
        get position() {
            if (this.cube)
                return this.cube.mtxLocal.translation;
            return null;
        }
        set position(_new) {
            if (this.cube && _new)
                this.cube.mtxLocal.translation = _new;
        }
    }
    Tsentris.GridElement = GridElement;
    class Grid extends Map {
        static cardinals = [ƒ.Vector3.X(1), ƒ.Vector3.X(-1), ƒ.Vector3.Y(1), ƒ.Vector3.Y(-1), ƒ.Vector3.Z(1), ƒ.Vector3.Z(-1)];
        // private grid: Map<string, Cube> = new Map();
        constructor() {
            super();
        }
        push(_position, _element) {
            let key = this.toKey(_position);
            if (this.pop(_position))
                ƒ.Debug.warn("Grid push to occupied position, popped: ", key);
            this.set(key, _element);
            if (_element)
                Tsentris.game.appendChild(_element.cube);
        }
        pull(_position) {
            let key = this.toKey(_position);
            let element = this.get(key);
            return element;
        }
        pop(_position) {
            let key = this.toKey(_position);
            let element = this.get(key);
            this.delete(key);
            if (element)
                Tsentris.game.removeChild(element.cube);
            return element;
        }
        findNeighbors(_of, _empty = false) {
            let found = [];
            let empty = [];
            for (let offset of Grid.cardinals) {
                let posNeighbor = ƒ.Vector3.SUM(_of, offset);
                let neighbor = Tsentris.grid.pull(posNeighbor);
                if (neighbor)
                    found.push(neighbor);
                else
                    empty.push(posNeighbor.map(Math.round));
            }
            return _empty ? empty : found;
        }
        compress() {
            let movesGain = [];
            for (let element of this) {
                let emptySpaces = this.findNeighbors(element[1].position, true);
                for (let target of emptySpaces) {
                    let relativeGain = element[1].position.magnitude / target.magnitude;
                    if (relativeGain > 1) {
                        let move = { value: relativeGain, target: target, element: element[1] };
                        movesGain.push(move);
                    }
                }
            }
            movesGain.sort((_a, _b) => _a.value < _b.value ? 1 : -1);
            let movesChosen = [];
            for (let move of movesGain) {
                let alreadyChosen = movesChosen.findIndex((_move) => _move.target.equals(move.target) || _move.element == move.element);
                if (alreadyChosen == -1)
                    movesChosen.push(move);
            }
            return movesChosen;
        }
        toKey(_position) {
            let position = _position.map(Math.round);
            let key = position.toString();
            return key;
        }
    }
    Tsentris.Grid = Grid;
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    Tsentris.ƒ = FudgeCore;
    let GAME_STATE;
    (function (GAME_STATE) {
        GAME_STATE[GAME_STATE["START"] = 0] = "START";
        GAME_STATE[GAME_STATE["MENU"] = 1] = "MENU";
        GAME_STATE[GAME_STATE["PLAY"] = 2] = "PLAY";
        GAME_STATE[GAME_STATE["OVER"] = 3] = "OVER";
    })(GAME_STATE || (GAME_STATE = {}));
    window.addEventListener("load", hndLoad);
    Tsentris.game = new Tsentris.ƒ.Node("FudgeCraft");
    Tsentris.grid = new Tsentris.Grid();
    let state = GAME_STATE.START;
    let control = new Tsentris.Control();
    let viewport;
    let speedCameraRotation = 0.2;
    let speedCameraTranslation = 0.02;
    function hndLoad(_event) {
        const canvas = document.querySelector("canvas");
        Tsentris.args = new URLSearchParams(location.search);
        // ƒ.RenderManager.initialize(true, true);
        Tsentris.ƒ.Debug.log("Canvas", canvas);
        // enable unlimited mouse-movement (user needs to click on canvas first)
        canvas.addEventListener("click", canvas.requestPointerLock);
        // set lights
        let cmpLight = new Tsentris.ƒ.ComponentLight(new Tsentris.ƒ.LightDirectional(Tsentris.ƒ.Color.CSS("WHITE")));
        cmpLight.mtxPivot.lookAt(new Tsentris.ƒ.Vector3(0.5, -1, -0.8));
        // game.addComponent(cmpLight);
        let cmpLightAmbient = new Tsentris.ƒ.ComponentLight(new Tsentris.ƒ.LightAmbient(new Tsentris.ƒ.Color(0.25, 0.25, 0.25, 1)));
        Tsentris.game.addComponent(cmpLightAmbient);
        // setup orbiting camera
        Tsentris.camera = new Tsentris.CameraOrbit(75);
        Tsentris.game.appendChild(Tsentris.camera);
        Tsentris.camera.setRotationX(-20);
        Tsentris.camera.setRotationY(20);
        Tsentris.camera.cmpCamera.node.addComponent(cmpLight);
        // setup viewport
        viewport = new Tsentris.ƒ.Viewport();
        viewport.initialize("Viewport", Tsentris.game, Tsentris.camera.cmpCamera, canvas);
        Tsentris.ƒ.Debug.log("Viewport", viewport);
        Tsentris.points = new Tsentris.Points(viewport, document.querySelector("#Score"), document.querySelector("div#Calculation"));
        // setup event handling
        // viewport.activatePointerEvent(ƒ.EVENT_POINTER.MOVE, true);
        // viewport.activateWheelEvent(ƒ.EVENT_WHEEL.WHEEL, true);
        viewport.canvas.addEventListener("mousemove", hndMouseMove);
        viewport.canvas.addEventListener("wheel", hndWheelMove);
        console.log(new Tsentris.ƒ.EventTouch(document));
        document.addEventListener(Tsentris.ƒ.EVENT_TOUCH.TAP, hndTouch);
        document.addEventListener(Tsentris.ƒ.EVENT_TOUCH.DOUBLE, hndTouch);
        document.addEventListener(Tsentris.ƒ.EVENT_TOUCH.MOVE, hndTouch);
        document.addEventListener(Tsentris.ƒ.EVENT_TOUCH.NOTCH, hndTouch);
        Tsentris.game.appendChild(control);
        if (Tsentris.args.get("test"))
            Tsentris.startTests();
        else
            start();
        updateDisplay();
        Tsentris.ƒ.Debug.log("Game", Tsentris.game);
    }
    function setState(_new) {
        state = _new;
        Tsentris.ƒ.Debug.log("State", state);
    }
    async function start() {
        setState(GAME_STATE.MENU);
        Tsentris.grid.push(Tsentris.ƒ.Vector3.ZERO(), new Tsentris.GridElement(new Tsentris.Cube(Tsentris.CUBE_TYPE.BLACK, Tsentris.ƒ.Vector3.ZERO())));
        startRandomFragment();
        Tsentris.ƒ.Debug.log("Wait for space");
        await waitForKeyPress(Tsentris.ƒ.KEYBOARD_CODE.SPACE);
        Tsentris.ƒ.Debug.log("Space pressed");
        let domMenu = document.querySelector("div#Menu");
        domMenu.style.visibility = "hidden";
        window.addEventListener("keydown", hndKeyDown); // activate when user starts...
        startCountDown();
        setState(GAME_STATE.PLAY);
    }
    function end() {
        let domOver = document.querySelector("div#Over");
        domOver.style.visibility = "visible";
        window.removeEventListener("keydown", hndKeyDown); // activate when user starts...
        setState(GAME_STATE.OVER);
    }
    async function waitForKeyPress(_code) {
        return new Promise(_resolve => {
            window.addEventListener("keydown", hndKeyDown);
            function hndKeyDown(_event) {
                if (_event.code == _code) {
                    window.removeEventListener("keydown", hndKeyDown);
                    _resolve();
                }
            }
        });
    }
    function startCountDown() {
        let countDown = new Tsentris.ƒ.Time();
        countDown.setTimer(1000, 0, showCountDown);
        function showCountDown(_event) {
            let time = 3 * 60 * 1000 - countDown.get();
            displayTime(time);
            if (time < 0) {
                countDown.clearAllTimers();
                displayTime(0);
                end();
            }
        }
    }
    function displayTime(_time) {
        let units = Tsentris.ƒ.Time.getUnits(_time);
        let domTime = document.querySelector("h1#Time");
        domTime.textContent = units.minutes.toString().padStart(2, "0") + ":" + units.seconds.toString().padStart(2, "0");
    }
    function updateDisplay() {
        viewport.draw();
    }
    Tsentris.updateDisplay = updateDisplay;
    //#region Interaction
    function hndTouch(_event) {
        _event.preventDefault();
        console.log(_event.type);
        if (Tsentris.ƒ.Time.game.hasTimers())
            return;
        switch (_event.type) {
            case Tsentris.ƒ.EVENT_TOUCH.MOVE:
                if (_event.detail.touches.length > 1) {
                    Tsentris.camera.rotateY(-_event.detail.movement.x * speedCameraRotation);
                    Tsentris.camera.rotateX(-_event.detail.movement.y * speedCameraRotation);
                }
                break;
            case Tsentris.ƒ.EVENT_TOUCH.NOTCH:
                if (_event.detail.touches.length > 1)
                    break;
                _event.detail.cardinal.y *= -1;
                let transformation = {};
                transformation = {
                    translation: _event.detail.cardinal.toVector3()
                };
                if (transformation != {})
                    move(transformation);
                updateDisplay();
                break;
            case Tsentris.ƒ.EVENT_TOUCH.DOUBLE:
                dropShape();
                break;
            default:
                break;
        }
        updateDisplay();
    }
    function hndMouseMove(_event) {
        Tsentris.camera.rotateY(_event.movementX * speedCameraRotation);
        Tsentris.camera.rotateX(_event.movementY * speedCameraRotation);
        updateDisplay();
    }
    function hndWheelMove(_event) {
        Tsentris.camera.translate(_event.deltaY * speedCameraTranslation);
        updateDisplay();
    }
    function hndKeyDown(_event) {
        if (Tsentris.ƒ.Time.game.hasTimers())
            return;
        if (_event.code == Tsentris.ƒ.KEYBOARD_CODE.SPACE) {
            dropShape();
        }
        let transformation = {}; //  = Control.transformations[_event.code];
        if (Tsentris.ƒ.Keyboard.isPressedOne([Tsentris.ƒ.KEYBOARD_CODE.SHIFT_LEFT, Tsentris.ƒ.KEYBOARD_CODE.SHIFT_RIGHT, Tsentris.ƒ.KEYBOARD_CODE.CTRL_LEFT, Tsentris.ƒ.KEYBOARD_CODE.CTRL_RIGHT]))
            transformation = {
                rotation: new Tsentris.ƒ.Vector3(-90 * Tsentris.ƒ.Keyboard.mapToTrit([Tsentris.ƒ.KEYBOARD_CODE.ARROW_UP, Tsentris.ƒ.KEYBOARD_CODE.W], [Tsentris.ƒ.KEYBOARD_CODE.ARROW_DOWN, Tsentris.ƒ.KEYBOARD_CODE.S]), 90 * Tsentris.ƒ.Keyboard.mapToTrit([Tsentris.ƒ.KEYBOARD_CODE.ARROW_RIGHT, Tsentris.ƒ.KEYBOARD_CODE.D], [Tsentris.ƒ.KEYBOARD_CODE.ARROW_LEFT, Tsentris.ƒ.KEYBOARD_CODE.A]), 0)
            };
        else
            transformation = {
                translation: new Tsentris.ƒ.Vector3(-1 * Tsentris.ƒ.Keyboard.mapToTrit([Tsentris.ƒ.KEYBOARD_CODE.ARROW_LEFT, Tsentris.ƒ.KEYBOARD_CODE.A], [Tsentris.ƒ.KEYBOARD_CODE.ARROW_RIGHT, Tsentris.ƒ.KEYBOARD_CODE.D]), 1 * Tsentris.ƒ.Keyboard.mapToTrit([Tsentris.ƒ.KEYBOARD_CODE.ARROW_UP, Tsentris.ƒ.KEYBOARD_CODE.W], [Tsentris.ƒ.KEYBOARD_CODE.ARROW_DOWN, Tsentris.ƒ.KEYBOARD_CODE.S]), 0)
            };
        if (transformation != {})
            move(transformation);
        updateDisplay();
    }
    //#endregion
    //#region Start/Drop Fragments
    function startRandomFragment() {
        let fragment = Tsentris.Shape.getRandom();
        let cardinals = Array.from(Tsentris.Grid.cardinals);
        control.mtxLocal.translation = Tsentris.ƒ.Vector3.ZERO();
        control.setShape(fragment);
        updateDisplay();
        let start = {};
        try {
            do {
                let index = Tsentris.ƒ.random.getIndex(cardinals);
                let offset = cardinals.splice(index, 1)[0];
                start = { translation: Tsentris.ƒ.Vector3.SCALE(offset, 5), rotation: Tsentris.ƒ.Vector3.ZERO() };
                // ƒ.Debug.log(control.checkCollisions(start).length );
            } while (control.checkCollisions(start).length > 0);
        }
        catch (_error) {
            callToAction("GAME OVER");
        }
        control.move(start);
        updateDisplay();
    }
    Tsentris.startRandomFragment = startRandomFragment;
    async function dropShape() {
        if (!control.isConnected()) {
            callToAction("CONNECT TO EXISTING CUBES!");
            return;
        }
        Tsentris.points.clearCalc();
        let dropped = control.dropFragment();
        let combos = new Tsentris.Combos(dropped);
        callToAction("CREATE COMBOS OF 3 OR MORE!");
        let iCombo = await handleCombos(combos, 0);
        if (iCombo > 0) {
            compressAndHandleCombos(iCombo);
            if (Tsentris.ƒ.random.getBoolean())
                callToAction("MULTIPLE COMBOS SCORE HIGHER!");
            else
                callToAction("LARGER COMBOS SCORE HIGHER!");
        }
        startRandomFragment();
        updateDisplay();
    }
    //#endregion
    //#region Combos & Compression
    async function compressAndHandleCombos(_iCombo) {
        let moves;
        let iCombo = _iCombo;
        do {
            moves = compress();
            await Tsentris.ƒ.Time.game.delay(400);
            let moved = moves.map(_move => _move.element);
            let combos = new Tsentris.Combos(moved);
            let iCounted = await handleCombos(combos, iCombo);
            iCombo += iCounted;
        } while (moves.length > 0);
    }
    Tsentris.compressAndHandleCombos = compressAndHandleCombos;
    async function handleCombos(_combos, _iCombo) {
        let iCombo = 0;
        for (let combo of _combos.found)
            if (combo.length > 2) {
                iCombo++;
                Tsentris.points.showCombo(combo, _iCombo + iCombo);
                for (let shrink = Math.PI - Math.asin(0.9); shrink >= 0; shrink -= 0.2) {
                    for (let element of combo) {
                        let mtxLocal = element.cube.mtxLocal;
                        mtxLocal.scaling = Tsentris.ƒ.Vector3.ONE(Math.sin(shrink) * 1.2);
                    }
                    updateDisplay();
                    await Tsentris.ƒ.Time.game.delay(20);
                }
                for (let element of combo)
                    Tsentris.grid.pop(element.position);
            }
        updateDisplay();
        return iCombo;
    }
    Tsentris.handleCombos = handleCombos;
    function move(_transformation) {
        let animationSteps = 5;
        let mtxControl = Tsentris.camera.getControlMatrix();
        let move = {
            rotation: _transformation.rotation ? Tsentris.ƒ.Vector3.TRANSFORMATION(_transformation.rotation, mtxControl) : new Tsentris.ƒ.Vector3(),
            translation: _transformation.translation ? Tsentris.ƒ.Vector3.TRANSFORMATION(_transformation.translation, mtxControl) : new Tsentris.ƒ.Vector3()
        };
        if (control.checkCollisions(move).length > 0)
            return;
        move.translation.scale(1 / animationSteps);
        move.rotation.scale(1 / animationSteps);
        Tsentris.ƒ.Time.game.setTimer(20, animationSteps, function (_event) {
            control.move(move);
            updateDisplay();
        });
    }
    function compress() {
        let moves = Tsentris.grid.compress();
        for (let move of moves) {
            Tsentris.grid.pop(move.element.position);
            Tsentris.grid.push(move.target, move.element);
        }
        let animationSteps = 5;
        Tsentris.ƒ.Time.game.setTimer(20, animationSteps, function (_event) {
            for (let move of moves) {
                let translation = Tsentris.ƒ.Vector3.DIFFERENCE(move.target, move.element.position);
                translation.normalize(1 / animationSteps);
                move.element.position = Tsentris.ƒ.Vector3.SUM(move.element.position, translation);
                if (_event.lastCall)
                    move.element.position = move.target;
            }
            updateDisplay();
        });
        return moves;
    }
    Tsentris.compress = compress;
    //#endregion
    function callToAction(_message) {
        let span = document.querySelector("span#CallToAction");
        span.textContent = _message;
        span.style.animation = "none";
        isNaN(span.offsetHeight); // stupid hack to restart css-animation, read offsetHeight
        span.style.animation = "";
    }
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    class DomLabel {
        static maxLifeTime = 1000; // in milliseconds
        domElement;
        posWorld;
        lifeTime = DomLabel.maxLifeTime;
        constructor(_domElement, _node) {
            this.domElement = _domElement;
            this.posWorld = _node.mtxWorld.translation.clone;
        }
        place(_viewport, _lapse) {
            // let projection: ƒ.Vector3 = _viewport.camera.project(this.posWorld);
            // let position: ƒ.Vector2 = _viewport.pointClipToClient(projection.toVector2());
            let position = _viewport.pointWorldToClient(this.posWorld);
            position = _viewport.pointClientToScreen(position);
            this.lifeTime -= _lapse;
            if (this.lifeTime < 0)
                return false;
            this.domElement.style.left = position.x + "px";
            this.domElement.style.top = (position.y - 40 + 40 * this.lifeTime / DomLabel.maxLifeTime) + "px";
            return true;
        }
    }
    class Points extends Array {
        score = 0;
        viewport;
        time = new Tsentris.ƒ.Time();
        domScore;
        domCalculation;
        constructor(_viewport, _domScore, _domCalculation) {
            super();
            this.viewport = _viewport;
            this.domCalculation = _domCalculation;
            this.domScore = _domScore;
            if (this.domScore)
                this.time.setTimer(40, 0, this.animate);
        }
        showCombo(_combo, _iCombo) {
            let pointsCombo = 0;
            let pointsCube = Math.pow(2, _iCombo - 1);
            for (let element of _combo) {
                this.create(element, pointsCube);
                pointsCombo += pointsCube;
                pointsCube *= 2;
            }
            this.score += pointsCombo;
            let text = _iCombo + ". combo of " + _combo.length + " cubes ⇨ " + pointsCombo;
            this.addLineCalc(text, _combo[0].cube.getColor().getCSS());
            this.domScore.textContent = "Score: " + this.score;
            Tsentris.ƒ.Debug.log(text);
        }
        create(_element, _points) {
            let domPoints = document.createElement("span");
            let domLabel = new DomLabel(domPoints, _element.cube);
            document.querySelector("div#PointsAnimation").appendChild(domLabel.domElement);
            domPoints.textContent = "+" + _points; //.toString();
            domPoints.style.color = _element.cube.getColor().getCSS();
            this.push(domLabel);
        }
        remove(_index) {
            let domLabel = this[_index];
            domLabel.domElement.parentNode.removeChild(domLabel.domElement);
            this.splice(_index, 1);
        }
        addLineCalc(_text, _color) {
            let line = document.createElement("div");
            line.textContent = _text;
            line.style.color = _color;
            this.domCalculation.appendChild(line);
        }
        clearCalc() {
            this.domCalculation.innerHTML = "";
        }
        animate = (_event) => {
            let lapse = _event.target.lapse;
            for (let i = this.length - 1; i >= 0; i--) {
                let domLabel = this[i];
                let stillAlive = domLabel.place(this.viewport, lapse);
                if (stillAlive)
                    continue;
                this.remove(i);
            }
        };
    }
    Tsentris.Points = Points;
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    var ƒ = FudgeCore;
    class Shape extends ƒ.Node {
        static shapes = Shape.getShapeArray();
        position = new ƒ.Vector3(0, 0, 0);
        constructor(_shape, _position = ƒ.Vector3.ZERO()) {
            super("Fragment-Type" + _shape);
            let shape = Shape.shapes[_shape];
            for (let position of shape) {
                let type;
                do {
                    type = Shape.getRandomEnum(Tsentris.CUBE_TYPE);
                } while (type == Tsentris.CUBE_TYPE.BLACK);
                let vctPosition = ƒ.Vector3.ZERO();
                vctPosition.set(position[0], position[1], position[2]);
                let cube = new Tsentris.Cube(type, vctPosition);
                this.appendChild(cube);
            }
            this.addComponent(new ƒ.ComponentTransform(ƒ.Matrix4x4.TRANSLATION(_position)));
        }
        static getRandom() {
            let shape = Math.floor(Math.random() * Shape.shapes.length);
            let fragment = new Shape(shape);
            return fragment;
        }
        static getShapeArray() {
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
        static getRandomEnum(_enum) {
            let randomKey = Object.keys(_enum)[Math.floor(Math.random() * Object.keys(_enum).length)];
            return _enum[randomKey];
        }
    }
    Tsentris.Shape = Shape;
})(Tsentris || (Tsentris = {}));
var Tsentris;
(function (Tsentris) {
    function startTests() {
        switch (Tsentris.args.get("test")) {
            case "grid":
                testGrid();
                break;
            case "combos":
                testCombos();
                break;
            case "compression":
                testCompression();
                break;
            case "camera":
                testCamera();
                break;
            case "points":
                testPoints();
                break;
            default:
                alert("Test not defined");
        }
    }
    Tsentris.startTests = startTests;
    function testPoints() {
        let setups = [
            { type: Tsentris.CUBE_TYPE.BLACK, positions: [[0, 0, 0]] },
            { type: Tsentris.CUBE_TYPE.RED, positions: [[2, 0, 0]] },
            { type: Tsentris.CUBE_TYPE.GREEN, positions: [[0, 2, 0]] },
            { type: Tsentris.CUBE_TYPE.BLUE, positions: [[0, 0, 2]] }
            // { type: CUBE_TYPE.YELLOW, positions: [[-2, 0, 0]] },
            // { type: CUBE_TYPE.CYAN, positions: [[0, -2, 0]] },
            // { type: CUBE_TYPE.MAGENTA, positions: [[0, 0, -2]] }
        ];
        setupGrid(setups);
        Tsentris.updateDisplay();
        let elements = Array.from(Tsentris.grid.values());
        Tsentris.ƒ.Debug.log(elements);
        Tsentris.points.showCombo(elements, 1);
    }
    function testCamera() {
        let setups = [
            { type: Tsentris.CUBE_TYPE.BLACK, positions: [[0, 0, 0]] }
        ];
        setupGrid(setups);
        Tsentris.startRandomFragment();
        Tsentris.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, rotateY);
        Tsentris.ƒ.Loop.start();
        // ƒ.Time.game.setTimer(4, 0, rotateY);
        function rotateY(_event) {
            Tsentris.camera.rotateY(1 * Tsentris.ƒ.Loop.timeFrameReal);
            // camera.rotateX(5 * Math.sin(ƒ.Time.game.get() / 100));
            Tsentris.updateDisplay();
        }
    }
    async function testCompression() {
        let setups = [
            { type: Tsentris.CUBE_TYPE.BLACK, positions: [[0, 0, 0]] },
            // four combos
            // { type: CUBE_TYPE.RED, positions: [[-2, -2, 0], [-2, -2, 1], [-2, -2, -1]] },
            // { type: CUBE_TYPE.GREEN, positions: [[0, -2 , 0], [1, -2, 0], [-1, -2, 0]] },
            // { type: CUBE_TYPE.BLUE, positions: [[0, 0, 2], [0, -1, 2], [0, 1, 2]] },
            // { type: CUBE_TYPE.YELLOW, positions: [[0, -2, -2], [1, -2, -2], [-1, -2, -2]] }
            // one combo travel
            // two combos following up
            { type: Tsentris.CUBE_TYPE.BLUE, positions: [[-1, 0, 0], [1, 0, 0]] },
            { type: Tsentris.CUBE_TYPE.RED, positions: [[-1, 0, -1], [0, 0, -1], [1, 0, -4]] },
            { type: Tsentris.CUBE_TYPE.GREEN, positions: [[0, 0, -2], [1, 0, -3], [1, 0, -1]] },
            { type: Tsentris.CUBE_TYPE.YELLOW, positions: [[-3, 0, -2], [0, 0, -5], [0, 0, -10]] }
        ];
        setupGrid(setups);
        Tsentris.updateDisplay();
        // debugger;
        // ƒ.Time.game.setScale(0.2);
        await Tsentris.ƒ.Time.game.delay(2000);
        Tsentris.compressAndHandleCombos(0);
    }
    function testCombos() {
        let setups = [
            { type: Tsentris.CUBE_TYPE.RED, positions: [[0, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, -1], [-1, 0, 0]] },
            { type: Tsentris.CUBE_TYPE.GREEN, positions: [[-5, 0, 0], [-5, 0, 1], [-5, 1, 2], [-5, -1, 2], [-5, 0, 2]] },
            { type: Tsentris.CUBE_TYPE.CYAN, positions: [[3, 0, 0], [3, 0, 1], [3, 0, 2], [3, 0, 3], [3, 0, 4], [3, 0, 5], [3, 0, 6], [3, 0, -1], [3, 0, -2]] },
            { type: Tsentris.CUBE_TYPE.BLUE, positions: [[0, 3, 0], [0, 3, 1], [0, 3, 2], [1, 3, 2], [2, 3, 2], [2, 3, 1], [2, 3, 0], [1, 3, 0], [0, 3, 0]] }
        ];
        setupGrid(setups);
        let startElements = setups.map((_setup) => {
            return Tsentris.grid.pull(new Tsentris.ƒ.Vector3(..._setup.positions[1]));
        });
        let combos = new Tsentris.Combos(startElements);
        Tsentris.handleCombos(combos, 1);
    }
    function testGrid() {
        let cube = new Tsentris.Cube(Tsentris.CUBE_TYPE.GREEN, Tsentris.ƒ.Vector3.ZERO());
        Tsentris.grid.push(cube.mtxLocal.translation, new Tsentris.GridElement(cube));
        let pulled = Tsentris.grid.pull(cube.mtxLocal.translation);
        logResult(cube == pulled.cube, "Grid push and pull", cube, pulled.cube, pulled);
        let popped = Tsentris.grid.pop(cube.mtxLocal.translation);
        logResult(cube == popped.cube, "Grid pop", cube, popped.cube, popped);
        let empty = Tsentris.grid.pull(cube.mtxLocal.translation);
        logResult(empty == undefined, "Grid element deleted");
    }
    function setupGrid(_setups) {
        _setups.forEach((_setup) => {
            _setup.positions.forEach((_position) => {
                let position = new Tsentris.ƒ.Vector3(..._position);
                let cube = new Tsentris.Cube(_setup.type, position);
                Tsentris.grid.push(position, new Tsentris.GridElement(cube));
            });
        });
    }
    function logResult(_success, ..._args) {
        let log = _success ? Tsentris.ƒ.Debug.log : Tsentris.ƒ.Debug.warn;
        log(`Test success: ${_success}`, _args);
    }
})(Tsentris || (Tsentris = {}));
