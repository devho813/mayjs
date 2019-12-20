import React, {useRef, useMemo, memo, useEffect, useCallback} from 'react';
import * as THREE from "three";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader';

function loadTexture() {
  // Texture
  const MONSTER_EGGPLANT_01_ALBEDO = new THREE.TextureLoader().load(`${require('../static/assets/textures/monster_eggplant_01_albedo.png')}`);
  const MONSTER_FRUIT_01_ALBEDO = new THREE.TextureLoader().load(`${require('../static/assets/textures/monster_fruit_01_albedo.png')}`);
  const MONSTER_FRUIT_02_ALBEDO = new THREE.TextureLoader().load(`${require('../static/assets/textures/monster_fruit_02_albedo.png')}`);
  const MONSTER_FRUIT_03_ALBEDO = new THREE.TextureLoader().load(`${require('../static/assets/textures/monster_fruit_03_albedo.png')}`);
  const GROUND_TEXTURE = new THREE.TextureLoader().load(`${require('../static/assets/textures/grasslight-big.jpg')}`);

  return {
    MONSTER_EGGPLANT_01_ALBEDO,
    MONSTER_FRUIT_01_ALBEDO,
    MONSTER_FRUIT_02_ALBEDO,
    MONSTER_FRUIT_03_ALBEDO,
    GROUND_TEXTURE
  }
}

function MayjsCharacter() {
  const container = useRef<HTMLDivElement | null>(null);
  const camera = useRef(new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000));
  const renderer = useRef(new THREE.WebGLRenderer({ antialias: true }));
  const scene = useRef(new THREE.Scene());
  const requestFrameID = useRef<number>();
  
  const spotLight = useRef(new THREE.SpotLight(0xffffff, 1));

  const models = useRef<THREE.Group[]>([]);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2(1, 1));
  const texture = useRef<ReturnType<typeof loadTexture>>(useMemo(() => loadTexture(), []))

  const intersects = useRef<THREE.Intersection[]>();
  const targetModel = useRef<THREE.Object3D | null>();
  const prevTargetModel = useRef<THREE.Object3D | null>();

  useEffect(() => {
    init();
    loadModel();
    config(); // 부가 설정
    renderAnimate();

    // 반응형
    window.addEventListener("resize", handleWindowResize, false);
    window.addEventListener("mousemove", handleMouseMove, false);

    return () => {
      window.removeEventListener("resize", handleWindowResize, false);
      window.removeEventListener("mousemove", handleMouseMove, false);
      if(requestFrameID.current) window.cancelAnimationFrame(requestFrameID.current);
    }
  }, []);

  const init = useCallback(() => {
      
    // 렌더러 설정
    renderer.current.setSize(window.innerWidth, window.innerHeight+5);
    renderer.current.gammaInput = true;
    renderer.current.gammaOutput = true;
    renderer.current.shadowMap.enabled = true;
    renderer.current.setPixelRatio(window.devicePixelRatio);
    container.current?.appendChild(renderer.current.domElement);

    // 씬 생성
    scene.current.background = new THREE.Color(0x050505);

    // 빛
    spotLight.current.position.set(-10, 200, 160);
    spotLight.current.angle = Math.PI / 6;
    spotLight.current.penumbra = 0.3;
    // spotLight.current.decay = 2;
    spotLight.current.distance = 500;

    spotLight.current.castShadow = true;
    // spotLight.current.shadow.mapSize.width = 1024;
    // spotLight.current.shadow.mapSize.height = 1024;
    scene.current.add(spotLight.current);

    // 카메라
    camera.current.position.set(-50, 100, 230);
    scene.current.add(camera.current);

    // 땅바닥
    const gg = new THREE.PlaneBufferGeometry(2000, 2000);
    const gm = new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture.current.GROUND_TEXTURE });

    const ground: any | THREE.Mesh = new THREE.Mesh(gg, gm);
    ground.rotation.x = -Math.PI / 2;
    ground.material.map.repeat.set(6, 6);
    ground.material.map.wrapS = ground.material.map.wrapT = THREE.RepeatWrapping;
    ground.receiveShadow = true;
    scene.current.add(ground);
  }, []);

  const loadModel = useCallback(() => {
    // Mesh 생성
    const loader = new FBXLoader();

    // MONSTER_EGGPLANT_01
    loader.load(`${require('../static/assets/models/monster_eggplant_01_test.FBX')}`, function (model: THREE.Group) {
      model.traverse(function (childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_EGGPLANT_01_ALBEDO
          })
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });
      model.position.set(-30, 0, -50);
      model.scale.set(0.8, 0.8, 0.8);
      scene.current.add(model);
      models.current.push(model);
    });

    // MONSTER_FRUIT_01
    loader.load(`${require('../static/assets/models/monster_fruit_01.FBX')}`, function (model: THREE.Group) {
      model.traverse(function (childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_FRUIT_01_ALBEDO
          })
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });

      model.position.set(30, 0, 20);
      scene.current.add(model);
      models.current.push(model);
    });

    // MONSTER_FRUIT_02
    loader.load(`${require('../static/assets/models/monster_fruit_02.FBX')}`, function (model: THREE.Group) {
      model.traverse(function (childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_FRUIT_02_ALBEDO
          })
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });

      model.position.set(-50, 0, 20);
      scene.current.add(model);
      models.current.push(model);
    });

    // MONSTER_FRUIT_03
    loader.load(`${require('../static/assets/models/monster_fruit_03.FBX')}`, function (model: THREE.Group) {
      model.traverse(function (childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_FRUIT_03_ALBEDO
          })
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });

      model.position.z = 50;
      scene.current.add(model);
      models.current.push(model);
    });
  }, []);

  const config = useCallback(() => {
    // 빛 helper
    // const lightHelper = new THREE.DirectionalLightHelper(spotLight, 10);
    // scene.add(lightHelper);

    // 좌표축 세팅(axes)
    // const axesHelper = new THREE.AxesHelper(100);
    // scene.current.add(axesHelper);

    // OrbitControls
    const controls = new OrbitControls(camera.current, renderer.current.domElement);
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.minDistance = 100;
    controls.maxDistance = 800;
    controls.update();

    // stats
    // stats = new Stats();
    // document.body.appendChild(stats.dom);
  }, [])

  const renderAnimate = useCallback(() => {
    if (models.current.length > 0) {
      raycaster.current.setFromCamera(mouse.current, camera.current);
      intersects.current = raycaster.current.intersectObjects(models.current, true);
      targetModel.current = intersects.current[0] ? intersects.current[0].object.parent : null; // group

      if (targetModel.current) {
        if (prevTargetModel.current && targetModel.current !== prevTargetModel.current) {
          prevTargetModel.current.position.y = 0;
        }

        targetModel.current.position.y += 0.1;
        prevTargetModel.current = targetModel.current;
      } else {
        if (prevTargetModel.current) {
          prevTargetModel.current.position.y = 0;
        }
      }
    }

    renderer.current.render(scene.current, camera.current);
    requestFrameID.current = requestAnimationFrame(renderAnimate);
  }, [])

  const handleWindowResize = useCallback((e: UIEvent) => {
    renderer.current.setSize(window.innerWidth, window.innerHeight+5);
    camera.current.aspect = window.innerWidth / window.innerHeight;
    camera.current.updateProjectionMatrix();
  }, []);
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    event.preventDefault();

    mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = - (event.clientY / window.innerHeight) * 2 + 1;
  }, []);

  return (
    <div ref={container}></div>
  )
}

export default memo(MayjsCharacter);