import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

type MoveState = {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}

function loadTexture() {
  // Texture
  const GROUND_TEXTURE = new THREE.TextureLoader().load(`${require('../static/assets/textures/grasslight-big.jpg')}`);
  const CUBE_TEXTURE = new THREE.TextureLoader().load(`${require('../static/assets/textures/grasslight-big.jpg')}`);
  const WALL_TEXTURE = new THREE.TextureLoader().load(`${require('../static/assets/textures/crate.gif')}`);
  const DOOR_TEXTURE = new THREE.TextureLoader().load(`${require('../static/assets/textures/open_door.png')}`);
  const MONSTER_FRUIT_TEXTURE = [
    new THREE.TextureLoader().load(`${require('../static/assets/textures/monster_fruit_01_albedo.png')}`),
    new THREE.TextureLoader().load(`${require('../static/assets/textures/monster_fruit_02_albedo.png')}`),
  ];

  return { GROUND_TEXTURE, CUBE_TEXTURE, WALL_TEXTURE, DOOR_TEXTURE, MONSTER_FRUIT_TEXTURE };
}

function MayjsGame() {
  const [gameStartState, setGameStartState] = useState(false);
  const [gameOverState, setgameOverState] = useState(false);
  const [gameWinState, setGameWinState] = useState(false);

  const container = useRef<HTMLDivElement | null>(null);
  const scene = useRef(new THREE.Scene());
  const renderer = useRef(new THREE.WebGLRenderer({ antialias: true }));
  const camera = useRef(new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000));

  const mapWideCubeCount = useRef<number>();
  const mapSize = useRef<number>(0);
  const collidableObjects = useRef<THREE.Group[] & THREE.Mesh[]>([]); // 충돌 방지 대상 objects

  const controls = useRef<PointerLockControls | any>();

  const CUBEWIDTH = useRef<number>(18);
  const CUBEHEIGHT = useRef<number>(30);

  // Flags to determine which direction the player is moving
  const moveState = useRef<MoveState>({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
  });

  const playerVelocity = useRef(new THREE.Vector3());
  const PLAYERSPEED = useRef(150.0);

  const clock = useRef(new THREE.Clock());

  const texture = useRef<ReturnType<typeof loadTexture>>(useMemo(() => loadTexture(), []));

  const goalDoor = useRef<THREE.Mesh>();
  const monsters = useRef<THREE.Group[]>([]);
  const monster_length = useRef(2);
  const MONSTERSCALE = useRef([0.2, 0.25]);
  const monsterVelocity = useRef([new THREE.Vector3(), new THREE.Vector3()]);
  const MONSETERSPEED = useRef([300.0, 300.0]);
  const PLAYERCOLLISIONDISTANCE = useRef(5); // 플레이어 충돌 거리
  const MONSTERCOLLISIONDISTANCE = useRef(CUBEWIDTH.current / 2); // 몬스터 충돌 거리
  const CATCHOFFSET = useRef(CUBEWIDTH.current); // 몬스터와의 거리
  const ARRIVEOFFSET = useRef(CUBEWIDTH.current * 2); // 도착 지점과 거리
  const gameOver = useRef(false);
  const gameWin = useRef(false);

  const requestFrameID = useRef<number>();

  useEffect(() => {
    init();
    getPointerLock();
    config();
    animate();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);

    return () => {
      window.removeEventListener('resize', onWindowResize, false);
      window.removeEventListener('keydown', onKeyDown, false);
      window.removeEventListener('keyup', onKeyUp, false);
      document.removeEventListener('pointerlockchange', lockChange, false);

      if (requestFrameID.current) window.cancelAnimationFrame(requestFrameID.current);
    };
  }, []);

  const init = useCallback(() => {
    scene.current.fog = new THREE.FogExp2(0xcccccc, 0.0015);
    scene.current.background = new THREE.Color( 0x222222 );
    
    renderer.current.setClearColor(scene.current.fog.color);
    renderer.current.setPixelRatio(window.devicePixelRatio);
    renderer.current.setSize(window.innerWidth, window.innerHeight);

    container.current?.appendChild(renderer.current.domElement);

    camera.current.position.set(0, CUBEHEIGHT.current / 2, 0);
    camera.current.rotation.y = degreesToRadians(90);
    scene.current.add(camera.current);
    
    createMazeCubes();
    createGoalDoor();
    createGround();
    createPerimWalls();
    createMonsters();
    addLights();

    controls.current = new PointerLockControls(camera.current, container.current ? container.current : undefined);
    scene.current.add(controls.current.getObject());
  }, []);

  const addLights = useCallback(() => {
    const lightOne = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.2);
    scene.current.add(lightOne);

    const flashlight = new THREE.SpotLight(0xffffff, 1.5, 40);
    camera.current.add(flashlight);
    flashlight.position.set(0, 0, 1);
    flashlight.target = camera.current;

    const startLight = new THREE.PointLight( 0xff0000, 1, 100 );
    startLight.position.set(0, 1, 0);
    scene.current.add(startLight);
    
    const goalLight = new THREE.PointLight( 0xffffff, 1, 50 );
    goalLight.position.set((mapSize.current / 2) - (CUBEWIDTH.current / 2), CUBEHEIGHT.current, mapSize.current / 2 - (CUBEWIDTH.current * 2));
    scene.current.add( goalLight );

  }, []);

  const createMazeCubes = useCallback(() => {
    // Maze wall mapping, assuming even square
    // 1's are cubes, 0's are empty space
    const map = [
      [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0],
      [0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
      [1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      [0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      [1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0],
      [0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0],
      [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0],
    ];

    // create cube
    const cubeGeo = new THREE.BoxBufferGeometry(CUBEWIDTH.current, CUBEHEIGHT.current, CUBEWIDTH.current);
    const cubeMat = new THREE.MeshPhongMaterial({ map: texture.current.CUBE_TEXTURE });

    // See how wide the map is by seeing how long the first array is
    mapWideCubeCount.current = map[0].length;

    // Place walls where 1`s are
    for (let i = 0; i < mapWideCubeCount.current; i++) {
      for (let j = 0; j < map[i].length; j++) {
        // If a 1 is found, add a cube at the corresponding position
        if (map[i][j]) {
          // Make the cube
          const cube = new THREE.Mesh(cubeGeo, cubeMat);
          cube.castShadow = true;
          cube.receiveShadow = true;

          // Set the cube position
          cube.position.z = (i - mapWideCubeCount.current / 2) * CUBEWIDTH.current + CUBEWIDTH.current / 2;
          cube.position.y = CUBEHEIGHT.current / 2;
          cube.position.x = (j - mapWideCubeCount.current / 2) * CUBEWIDTH.current + CUBEWIDTH.current / 2;
          // Add the cube
          scene.current.add(cube);
          // Used later for collision detection
          collidableObjects.current.push(cube);
        }
      }
    }
    // The size of the maze will be how many cubes wide the array is * the width of a cube
    mapSize.current = mapWideCubeCount.current * CUBEWIDTH.current;
  }, []);

  const createGoalDoor = useCallback(() => {
    const cubeGeo = new THREE.BoxBufferGeometry(CUBEWIDTH.current, CUBEHEIGHT.current, CUBEWIDTH.current * 2);
    const cubeMat = new THREE.MeshPhongMaterial({map: texture.current.DOOR_TEXTURE });
    const openDoor = new THREE.Mesh(cubeGeo, cubeMat);

    openDoor.castShadow = true;
    openDoor.receiveShadow = true;
    openDoor.position.x = mapSize.current / 2 - CUBEWIDTH.current / 2;
    openDoor.position.y = CUBEHEIGHT.current / 2;
    openDoor.position.z = mapSize.current / 2 - CUBEWIDTH.current / 2;
    goalDoor.current = openDoor;
    scene.current.add(openDoor);
    collidableObjects.current.push(openDoor);
  }, []);

  const createGround = useCallback(() => {
    const groundGeo = new THREE.PlaneBufferGeometry(mapSize.current, mapSize.current);
    const groundMat = new THREE.MeshPhongMaterial({
      side: THREE.BackSide,
      map: texture.current.GROUND_TEXTURE,
    });

    const ground: any | THREE.Mesh = new THREE.Mesh(groundGeo, groundMat);
    ground.material.map.repeat.set(15, 15);
    ground.material.map.wrapS = ground.material.map.wrapT = THREE.RepeatWrapping;
    ground.receiveShadow = true;
    ground.rotation.x = degreesToRadians(90);
    scene.current.add(ground);
  }, []);

  const createPerimWalls = useCallback(() => {
    const halfMap = mapSize.current / 2;
    let sign = 1;

    for (let i = 0; i < 2; i++) {
      const perimGeo = new THREE.PlaneBufferGeometry(mapSize.current, CUBEHEIGHT.current);
      const perimMat = new THREE.MeshPhongMaterial({
        color: 0x464646,
        side: THREE.DoubleSide,
        map: texture.current.WALL_TEXTURE,
      });
      const perimWallLR: THREE.Mesh | any = new THREE.Mesh(perimGeo, perimMat);
      const perimWallFB: THREE.Mesh | any = new THREE.Mesh(perimGeo, perimMat);

      // Create left/right wall
      perimWallLR.position.set(halfMap * sign, CUBEHEIGHT.current / 2, 0);
      perimWallLR.rotation.y = degreesToRadians(90);
      perimWallLR.material.map.repeat.set(5, 5);
      perimWallLR.material.map.wrapS = perimWallLR.material.map.wrapT = THREE.RepeatWrapping;
      scene.current.add(perimWallLR);
      collidableObjects.current.push(perimWallLR);

      // Create front/back wall
      perimWallFB.material.map.repeat.set(5, 5);
      perimWallFB.material.map.wrapS = perimWallFB.material.map.wrapT = THREE.RepeatWrapping;
      perimWallFB.position.set(0, CUBEHEIGHT.current / 2, halfMap * sign);
      scene.current.add(perimWallFB);
      collidableObjects.current.push(perimWallFB);

      sign = -1;
    }
  }, []);

  const createMonsters = useCallback(() => {
    const loader = new FBXLoader();

    for (let i = 0; i < 2; i++) {
      loader.load(`${require(`../static/assets/models/monster_fruit_0${i + 1}.FBX`)}`, function(model: THREE.Group) {
        model.traverse(function(childMesh) {
          if (childMesh instanceof THREE.Mesh) {
            childMesh.material = new THREE.MeshPhongMaterial({
              map: texture.current.MONSTER_FRUIT_TEXTURE[i],
            });
            childMesh.castShadow = true;
            childMesh.receiveShadow = true;
          }
        });

        model.scale.set(MONSTERSCALE.current[i], MONSTERSCALE.current[i], MONSTERSCALE.current[i]);
        model.position.set(i % 2 === 0 ? 150 : -150, 1, i % 2 === 0 ? 150 : -150);
        model.name = `monster_${i}`;
        scene.current.add(model);

        monsters.current[i] = scene.current.getObjectByName(`monster_${i}`) as THREE.Group;
        collidableObjects.current.push(monsters.current[i]);
      });
    }
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.keyCode) {
      case 38: // up
      case 87: // w
        moveState.current.moveForward = true;
        break;

      case 37: // left
      case 65: // a
        moveState.current.moveLeft = true;
        break;

      case 40: // down
      case 83: // s
        moveState.current.moveBackward = true;
        break;

      case 39: // right
      case 68: // d
        moveState.current.moveRight = true;
        break;
    }
  }, []);

  // A key has been released
  const onKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.keyCode) {
      case 38: // up
      case 87: // w
        moveState.current.moveForward = false;
        break;

      case 37: // left
      case 65: // a
        moveState.current.moveLeft = false;
        break;

      case 40: // down
      case 83: // s
        moveState.current.moveBackward = false;
        break;

      case 39: // right
      case 68: // d
        moveState.current.moveRight = false;
        break;
    }
  }, []);

  const getPointerLock = useCallback(() => {
    document.onclick = function() {
      container.current?.requestPointerLock();
    };
    document.addEventListener('pointerlockchange', lockChange, false);
  }, []);

  const lockChange = useCallback((event: Event) => {
    // Turn on controls
    if (document.pointerLockElement === container.current) {
      controls.current.enabled = true;
      setGameStartState(true);
      // Turn off the controls
    } else {
      if (gameOver.current || gameWin.current) {
        window.location.reload();
      }
      
      controls.current.enabled = false;
      setGameStartState(false);
    }
  }, []);

  const config = useCallback(() => {
    // 빛 helper
    // const lightHelper = new THREE.DirectionalLightHelper(spotLight, 10);
    // scene.add(lightHelper);

    // 좌표축 세팅(axes)
    // const axesHelper = new THREE.AxesHelper(100);
    // scene.current.add(axesHelper);

    // const orbitControls = new OrbitControls(camera, renderer.domElement);
    // orbitControls.target.set(0, 12, 0);
    // orbitControls.update();
  }, []);

  const rayIntersect = useCallback((ray: THREE.Raycaster, distance: number) => {
    const intersects = ray.intersectObjects(collidableObjects.current);
    for (let i = 0; i < intersects.length; i++) {
      if (intersects[i].distance < distance) {
        return true;
      }
    }
    return false;
  }, []);

  const detectPlayerCollision = useCallback(() => {
    // The rotation matrix to apply to our direction vector
    // Undefined by default to indicate ray should coming from front
    let rotationMatrix;
    // Get direction of camera
    const cameraDirection = controls.current.getDirection(new THREE.Vector3(0, 0, 0)).clone();

    // Check which direction we're moving (not looking)
    // Flip matrix to that direction so that we can reposition the ray
    if (moveState.current.moveBackward) {
      rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationY(degreesToRadians(180));
    } else if (moveState.current.moveLeft) {
      rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationY(degreesToRadians(90));
    } else if (moveState.current.moveRight) {
      rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationY(degreesToRadians(270));
    }

    // Player is not moving forward, apply rotation matrix needed
    if (rotationMatrix !== undefined) {
      cameraDirection.applyMatrix4(rotationMatrix);
    }

    // Apply ray to player camera
    const rayCaster = new THREE.Raycaster(controls.current.getObject().position, cameraDirection);

    // If our ray hit a collidable object, return true
    if (rayIntersect(rayCaster, PLAYERCOLLISIONDISTANCE.current)) {
      return true;
    } else {
      return false;
    }
  }, []);

  const animatePlayer = useCallback((delta: number) => {
    // Gradual slowdown
    playerVelocity.current.x -= playerVelocity.current.x * 10.0 * delta;
    playerVelocity.current.z -= playerVelocity.current.z * 10.0 * delta;

    // If no collision and a movement key is being pressed, apply movement velocity
    if (!detectPlayerCollision()) {
      if (moveState.current.moveForward) {
        playerVelocity.current.z -= PLAYERSPEED.current * delta;
      }
      if (moveState.current.moveBackward) {
        playerVelocity.current.z += PLAYERSPEED.current * delta;
      }
      if (moveState.current.moveLeft) {
        playerVelocity.current.x -= PLAYERSPEED.current * delta;
      }
      if (moveState.current.moveRight) {
        playerVelocity.current.x += PLAYERSPEED.current * delta;
      }

      controls.current.getObject().position.y = CUBEHEIGHT.current / 2;
      controls.current.getObject().translateX(playerVelocity.current.x * delta);
      controls.current.getObject().translateZ(playerVelocity.current.z * delta);
    } else {
      // Collision or no movement key being pressed. Stop movememnt
      playerVelocity.current.x = 0;
      playerVelocity.current.z = 0;
    }
  }, []);

  const detectMonsterCollision = useCallback((monsterIndex: number) => {
    const matrix = new THREE.Matrix4();
    matrix.extractRotation(monsters.current[monsterIndex].matrix);
    // Create direction vector
    const directionFront = new THREE.Vector3(0, 0, 1);
    directionFront.applyMatrix4(matrix);

    // Create raycaster
    const rayCasterF = new THREE.Raycaster(monsters.current[monsterIndex].position, directionFront);

    if (rayIntersect(rayCasterF, MONSTERCOLLISIONDISTANCE.current)) return true;
    else return false;
  }, []);

  const animateMonster = useCallback((monsterIndex: number, delta: number) => {
    // Gradual slowdown
    monsterVelocity.current[monsterIndex].x -= monsterVelocity.current[monsterIndex].x * 10.0 * delta;
    monsterVelocity.current[monsterIndex].z -= monsterVelocity.current[monsterIndex].z * 10.0 * delta;

    // If no collision, apply movement velocity
    if (!detectMonsterCollision(monsterIndex)) {
      monsterVelocity.current[monsterIndex].z += MONSETERSPEED.current[monsterIndex] * delta;
      // Move the monster
      monsters.current[monsterIndex].translateZ(monsterVelocity.current[monsterIndex].z * delta);
    } else {
      // Collision. Adjust direction
      const directionMultiples = [-1, 1];
      const randomIndex = Math.floor(Math.random() * 2);
      const randomDirection = degreesToRadians(-90 * directionMultiples[randomIndex]);

      monsterVelocity.current[monsterIndex].z += MONSETERSPEED.current[monsterIndex] * delta;
      monsters.current[monsterIndex].rotation.y += randomDirection;
    }
  }, []);

  const animate = useCallback(() => {
    render();
    requestFrameID.current = requestAnimationFrame(animate);

    const delta = clock.current.getDelta();

    if (!gameOver.current && controls.current.enabled) {
      animatePlayer(delta);
      
      if (goalDoor.current &&
        goalDoor.current.position.distanceTo(controls.current.getObject().position) < ARRIVEOFFSET.current) {
        // 목표 지점 도착
        arrive();
      }
      
      if (monsters.current.length === monster_length.current) { // 몬스터 렌더링 체크
        for (let i = 0; i < monster_length.current; i++) {
          if (monsters.current[i].position.distanceTo(controls.current.getObject().position) < CATCHOFFSET.current) {
            caught();
            // Player is at an undetected distance
            // Keep the dino moving and let the player keep moving too
          } else {
            animateMonster(i, delta);
          }
        }
      }
    }
  }, []);
  
  const arrive = useCallback(() => {
    controls.current.enabled = false;
    gameWin.current = true;
    setGameWinState(true);
  }, []);

  const caught = useCallback(() => {
    controls.current.enabled = false;
    gameOver.current = true;
    setgameOverState(true);
  }, []);

  const render = useCallback(() => {
    renderer.current.render(scene.current, camera.current);
  }, []);

  const onWindowResize = useCallback(() => {
    camera.current.aspect = window.innerWidth / window.innerHeight;
    camera.current.updateProjectionMatrix();

    renderer.current.setSize(window.innerWidth, window.innerHeight);
  }, []);

  const degreesToRadians = useCallback((degrees: number) => {
    return (degrees * Math.PI) / 180;
  }, []);

  const radiansToDegrees = useCallback((radians: number) => {
    return (radians * 180) / Math.PI;
  }, []);

  return (
    <>
      <Blocker id="blocker">
        {!gameStartState && (
          <ReadyAlert>
            <h1>마우스를 클릭하여 게임을 시작하세요.</h1>
            <h3>W, A, S, D키 또는 방향키로 이동할 수 있습니다.</h3>
          </ReadyAlert>
        )}
        {gameOverState && (
          <DieAlert>
            <h1>죽었습니다.</h1>
            <h3>ESC를 누르면 게임이 재시작됩니다</h3>
          </DieAlert>
        )}
        {gameWinState && (
          <WinAlert>
            <h1>탈출 성공!</h1>
            <h3>ESC를 누르면 게임이 재시작됩니다</h3>
          </WinAlert>
        )}
      </Blocker>

      <div ref={container}></div>
    </>
  );
}

export default MayjsGame;

const ReadyAlert = styled.div`
`;

const DieAlert = styled.div`
  color: red;
`;

const WinAlert = styled.div`
  color: skyblue;
`;

const Blocker = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 20px;
  font-style: italic;
  text-align: center;
`;
