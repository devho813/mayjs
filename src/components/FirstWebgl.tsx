import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

function FirstWebgl() {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef(new THREE.Scene());
  const camera = useRef(new THREE.PerspectiveCamera());
  const renderer = useRef(new THREE.WebGLRenderer());
  const cube = useRef(new THREE.Mesh());

  useEffect(() => {
    sceneSetup();
    addCustomSceneObjects();
    setConfig(); // 부가 기능 세팅
    startAnimationLoop();

    // 반응형
    window.addEventListener("resize", handleWindowResize, false);
    return () => {};
  }, []);

  const sceneSetup = useCallback(() => {
    const width = container.current?.clientWidth || window.innerWidth;
    const height = container.current?.clientHeight || window.innerHeight;

    camera.current.fov = 75;
    camera.current.aspect = width / height;
    camera.current.near = 0.1;
    camera.current.far = 1000;
    camera.current.position.z = 5;

    renderer.current.setSize(width, height);
    container.current?.appendChild(renderer.current.domElement);
  }, []);

  const addCustomSceneObjects = useCallback(() => {
    const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x156289,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      flatShading: true
    });

    cube.current.geometry = geometry;
    cube.current.material = material;
    scene.current.add(cube.current);

    const lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 1, 0);
    lights[1] = new THREE.PointLight(0xffffff, 1, 0);
    lights[2] = new THREE.PointLight(0xffffff, 1, 0);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    scene.current.add(lights[0]);
    scene.current.add(lights[1]);
    scene.current.add(lights[2]);
  }, []);

  const setConfig = useCallback(() => {
    if (container.current) new OrbitControls(camera.current, container.current);

    // 좌표축 세팅(axes)
    const axesHelper = new THREE.AxesHelper(50);
    scene.current.add(axesHelper);
  }, []);

  const startAnimationLoop = useCallback(() => {
    cube.current.rotation.x += 0.01;
    cube.current.rotation.y += 0.01;

    renderer.current.render(scene.current, camera.current);
    window.requestAnimationFrame(startAnimationLoop);
  }, []);

  const handleWindowResize = useCallback(() => {
    const width = container.current?.clientWidth || window.innerWidth;
    const height = container.current?.clientHeight || window.innerHeight;

    renderer.current.setSize(width, height);
    camera.current.aspect = width / height;
    camera.current.updateProjectionMatrix();
  }, []);

  return <div id="container" ref={container} />;
}

export default FirstWebgl;
