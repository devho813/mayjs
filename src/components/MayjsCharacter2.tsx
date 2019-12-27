import React, { memo, useRef, useMemo, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import styled from 'styled-components';
import { FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import debounce from 'lodash/debounce';

type Direction = 'LEFT' | 'RIGHT';

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
  // const ZBRUSH_STICKFIGUR = new THREE.TextureLoader().load(`${require("../static/assets/textures/zbrushstigur_00000.jpg")}`);

  return {
    // ZBRUSH_STICKFIGUR,
  };
}

function MayjsCharacter2() {
  const container = useRef<HTMLDivElement>(null);
  const camera = useRef(new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 5000));
  const scene = useRef(new THREE.Scene());
  const renderer = useRef(new THREE.WebGLRenderer({ antialias: true }));
  const dirLight = useRef(new THREE.DirectionalLight(0xffffff, 1));
  const hemiLight = useRef(new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6));

  const mainModel = useRef<THREE.Group>();

  const requestFrameID = useRef<number>();

  const mixer = useRef<THREE.AnimationMixer>();
  const clock = useRef(new THREE.Clock());

  const animClipIndex = useRef(0);

  useEffect(() => {
    init();
    loadModel();
    animate();

    // 반응형
    window.addEventListener('resize', handleWindowResize, false);

    return () => {
      window.removeEventListener('resize', handleWindowResize, false);
      if (requestFrameID.current) window.cancelAnimationFrame(requestFrameID.current);
    };
  }, []);
  
  const getAnimClipIndex = useCallback((direction: Direction): number => {
    const animClipLength: number = (mainModel.current as any).animations.length;
    
    if(direction === 'RIGHT' && animClipIndex.current !== animClipLength - 1){
      animClipIndex.current++;
    }
    if(direction === 'LEFT' && animClipIndex.current !== 0){
      animClipIndex.current--;
    }

    return animClipIndex.current;
  }, []);

  const changeAnimClip = useCallback(debounce((direction: Direction): void => {
    mixer.current?.stopAllAction();
    const action = mixer.current?.clipAction((mainModel.current as any).animations[getAnimClipIndex(direction)]);
    action?.play();
  }, 200), []);

  const onClickArrow = useCallback((direction: Direction) => () => {
    changeAnimClip(direction);
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
    const groundGeo = new THREE.PlaneBufferGeometry(5000, 5000);
    const groundMat = new THREE.MeshLambertMaterial();
    groundMat.color.setHSL(1, 1, 1);

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
      exponent: { value: 0.6 },
    };
    uniforms['topColor'].value.copy(hemiLight.current.color);

    scene.current.fog.color.copy(uniforms['bottomColor'].value);

    const skyGeo = new THREE.SphereBufferGeometry(4000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.current.add(sky);
  }, []);

  const loadModel = useCallback(() => {
    // MODEL
    const loader = new FBXLoader();

    // Pikachu
    loader.load(`${require('../static/assets/models/Pikachu fbx')}`, function(model: THREE.Group) {
      mixer.current = new THREE.AnimationMixer(model);
      const action = mixer.current.clipAction((model as any).animations[animClipIndex.current]);
      action.play();

      model.traverse(function(childMesh: THREE.Object3D) {
        if (childMesh instanceof THREE.Mesh) {
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });
      model.position.set(0, -33, 0);
      model.scale.set(0.1, 0.1, 0.1);
      mainModel.current = model;
      scene.current.add(model);
    });
  }, []);

  const animate = useCallback(() => {
    const delta = clock.current.getDelta();
    if (mixer.current) mixer.current.update(delta);
    
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

  return (
    <div ref={container}>
      <ArrowWrapper>
        <FiChevronsLeft onClick={onClickArrow('LEFT')} />
        <FiChevronsRightArrow onClick={onClickArrow('RIGHT')} />
        <div style={{ clear: 'both' }}></div>
      </ArrowWrapper>
    </div>
  );
}

export default memo(MayjsCharacter2);

const ArrowWrapper = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 650px;
  height: 100px;

  svg {
    width: 100px;
    height: 100%;
    color: black;
    cursor: pointer;
  }
`;

const FiChevronsRightArrow = styled(FiChevronsRight)`
  float: right;
`;
