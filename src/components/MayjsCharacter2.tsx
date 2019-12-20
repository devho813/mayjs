import React, { memo, useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const fragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;

  varying vec3 vWorldPosition;

  void main() {
    float h = normalize( vWorldPosition + offset ).y;
    gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
  }
`;

function loadTexture() {
  // Texture
  const MONSTER_EGGPLANT_01_ALBEDO = new THREE.TextureLoader().load(`${require("../static/assets/textures/monster_eggplant_01_albedo.png")}`);
  const MONSTER_FRUIT_01_ALBEDO = new THREE.TextureLoader().load(`${require("../static/assets/textures/monster_fruit_01_albedo.png")}`);
  const MONSTER_FRUIT_02_ALBEDO = new THREE.TextureLoader().load(`${require("../static/assets/textures/monster_fruit_02_albedo.png")}`);
  const MONSTER_FRUIT_03_ALBEDO = new THREE.TextureLoader().load(`${require("../static/assets/textures/monster_fruit_03_albedo.png")}`);

  return {
    MONSTER_EGGPLANT_01_ALBEDO,
    MONSTER_FRUIT_01_ALBEDO,
    MONSTER_FRUIT_02_ALBEDO,
    MONSTER_FRUIT_03_ALBEDO
  };
}

function MayjsCharacter2() {
  const container = useRef<HTMLDivElement | null>(null);
  const camera = useRef(new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 5000));
  const scene = useRef(new THREE.Scene());
  const renderer = useRef(new THREE.WebGLRenderer({ antialias: true }));
  const dirLight = useRef(new THREE.DirectionalLight(0xffffff, 1));
  const hemiLight = useRef(new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6));

  const models = useRef<THREE.Group[]>([]);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2(1, 1));

  const texture = useRef<ReturnType<typeof loadTexture>>(
    useMemo(() => loadTexture(), [])
  );

  const intersects = useRef<THREE.Intersection[]>();
  const targetModel = useRef<THREE.Object3D | null>();

  const requestFrameID = useRef<number>();

  useEffect(() => {
    init();
    loadModel();
    config(); // 부가 설정
    animate();

    // 반응형
    window.addEventListener("resize", handleWindowResize, false);
    window.addEventListener("mousemove", handleMouseMove, false);
    window.addEventListener("mousedown", handleMouseDown, false);

    return () => {
      window.removeEventListener("resize", handleWindowResize, false);
      window.removeEventListener("mousemove", handleMouseMove, false);
      window.removeEventListener("mousedown", handleMouseDown, false);
      if (requestFrameID.current)
        window.cancelAnimationFrame(requestFrameID.current);
    };
  }, []);

  const init = useCallback(() => {

    // RENDERER
    renderer.current.setPixelRatio(window.devicePixelRatio);
    renderer.current.setSize(window.innerWidth, window.innerHeight);
    renderer.current.gammaInput = true;
    renderer.current.gammaOutput = true;
    renderer.current.shadowMap.enabled = true;
    container.current?.appendChild(renderer.current.domElement);

    camera.current.position.set(0, 0, 250);

    scene.current.background = new THREE.Color().setHSL(0.6, 0, 1);
    scene.current.fog = new THREE.Fog(parseInt(scene.current.background.getHexString()), 1, 5000);

    // LIGHTS
    hemiLight.current.color.setHSL(0.6, 1, 0.6);
    hemiLight.current.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.current.position.set(0, 50, 0);
    scene.current.add(hemiLight.current);

    // dirLight
    dirLight.current.color.setHSL(0.1, 1, 0.95);
    dirLight.current.position.set(-1, 1.75, 1);
    scene.current.add(dirLight.current);

    dirLight.current.castShadow = true;

    dirLight.current.shadow.mapSize.width = 2048;
    dirLight.current.shadow.mapSize.height = 2048;

    const d = 50;

    dirLight.current.shadow.camera.left = -d;
    dirLight.current.shadow.camera.right = d;
    dirLight.current.shadow.camera.top = d;
    dirLight.current.shadow.camera.bottom = -d;

    dirLight.current.shadow.camera.far = 3500;
    dirLight.current.shadow.bias = -0.0001;

    // GROUND
    const groundGeo = new THREE.PlaneBufferGeometry(10000, 10000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    groundMat.color.setHSL(0.095, 1, 0.75);

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -33;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.current.add(ground);

    // SKYDOME

    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };
    uniforms["topColor"].value.copy(hemiLight.current.color);

    scene.current.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereBufferGeometry(4000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.current.add(sky);
  }, []);

  const loadModel = useCallback(() => {
    // MODEL
    const loader = new FBXLoader();

    // MONSTER_EGGPLANT_01
    loader.load(`${require('../static/assets/models/monster_eggplant_01.FBX')}`, function (model: THREE.Group) {
      model.traverse(function(childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_EGGPLANT_01_ALBEDO
          });
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });
      model.position.set(-40, -33, 0);
      model.scale.set(0.25, 0.25, 0.25);
      models.current.push(model);
      scene.current.add(model);
    });

    // MONSTER_FRUIT_01
    loader.load(`${require('../static/assets/models/monster_fruit_01.FBX')}`, function (model: THREE.Group) {
      model.traverse(function(childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_FRUIT_01_ALBEDO
          });
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });

      model.position.set(-5, -33, 0);
      model.scale.set(0.25, 0.25, 0.25);
      models.current.push(model);
      scene.current.add(model);
    });

    // MONSTER_FRUIT_02
    loader.load(`${require('../static/assets/models/monster_fruit_02.FBX')}`, function (model: THREE.Group) {
      model.traverse(function(childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_FRUIT_02_ALBEDO
          });
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });

      model.position.set(20, -33, 0);
      model.scale.set(0.25, 0.25, 0.25);
      models.current.push(model);
      scene.current.add(model);
    });

    // MONSTER_FRUIT_03
    loader.load(`${require('../static/assets/models/monster_fruit_03.FBX')}`, function (model: THREE.Group) {
      model.traverse(function(childMesh) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.material = new THREE.MeshPhongMaterial({
            map: texture.current.MONSTER_FRUIT_03_ALBEDO
          });
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });

      model.position.set(38, -33, 0);
      model.scale.set(0.25, 0.25, 0.25);
      models.current.push(model);
      scene.current.add(model);
    });
  }, []);

  const config = useCallback(() => {
    // 좌표축 세팅(axes)
    // const axesHelper = new THREE.AxesHelper(100);
    // scene.current.add(axesHelper);
  }, []);

  const animate = useCallback(() => {
    requestFrameID.current = requestAnimationFrame(animate);
    render();
  }, []);

  const render = useCallback(() => {
    renderer.current.render(scene.current, camera.current);
  }, []);

  const handleWindowResize = useCallback((e: UIEvent) => {
    renderer.current.setSize(window.innerWidth, window.innerHeight + 5);
    camera.current.aspect = window.innerWidth / window.innerHeight;
    camera.current.updateProjectionMatrix();
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    event.preventDefault();
    mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }, []);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();

    raycaster.current.setFromCamera(mouse.current, camera.current);
    intersects.current = raycaster.current.intersectObjects(models.current, true);
    targetModel.current = intersects.current[0] ? intersects.current[0].object.parent : null; // group

    if (targetModel.current) {
      const changeX = -targetModel.current.position.x;

      for (let i = 0; i < models.current.length; i++) {
        models.current[i].position.x += changeX;
      }
    }
  }, []);

  return <div ref={container}/>;
}

export default memo(MayjsCharacter2);
