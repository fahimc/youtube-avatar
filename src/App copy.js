import logo from "./logo.svg";
import "./App.css";
import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const desiredHeight = 720; // For example, 720px height
const aspectRatio = 16 / 9;
const width = window.innerWidth;
const height = width / aspectRatio;
const calculatedWidth = desiredHeight * aspectRatio;

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
// Update the camera aspect ratio
camera.aspect = aspectRatio;
camera.updateProjectionMatrix();
function App() {
  const containerRef = React.useRef();
  React.useEffect(() => {
    if (containerRef.current) {
      const scene = new THREE.Scene();
      renderer.setPixelRatio(window.devicePixelRatio);
      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(0, 1, 0);
      scene.add(directionalLight);
      const avatarURL =
        "https://models.readyplayer.me/6370d572777dc969696d3efa.glb";
      loader.load(
        avatarURL,
        function (gltf) {
          const avatar = gltf.scene;
          // Compute the bounding box of the avatar
          const bbox = new THREE.Box3().setFromObject(avatar);
          const center = bbox.getCenter(new THREE.Vector3());

          // Translate the avatar to center it
          avatar.position.x = 0.7;
          avatar.position.y = -0.4; // Adjust this if you want the avatar to be on the ground
          avatar.position.z = 0;

          scene.add(avatar);

          // Calculate the distance the camera should be from the avatar
          const size = bbox.getSize(new THREE.Vector3());
          const distance = size.y * 1.5;

          // Position the camera to frame the avatar based on its size
          camera.position.set(0, size.y / 2, distance);
          camera.lookAt(new THREE.Vector3(0, size.y / 2, 2));
        },
        undefined,
        function (error) {
          console.error(error);
        }
      );

      // Camera position
      // camera.position.z = 16;
      containerRef.current.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
      animate();
      // Handle window resize
      // Handle window resize
      window.addEventListener("resize", onWindowResize, false);
      function onWindowResize() {
        const newWidth = window.innerWidth;
        const newHeight = newWidth / aspectRatio;

        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
      onWindowResize();
    }
  }, []);

  return <div className="container" ref={containerRef}></div>;
}

export default App;
