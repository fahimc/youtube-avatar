import logo from "./logo.svg";
import "./App.css";
import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
let morphTargetInfluences;
let mixer;
let lastUpdateTime = 0;
let currentSpeed = 0.5;
let nextChangeTime = 0;
let lastBlinkTime = 0;
let eyeLeft, eyeRight;
let headBone;
let lastNodTime = 0;

const nodInterval = 4000; // Time between nods in milliseconds
const nodDuration = 500; // Duration of a nod in milliseconds
const naturalHeadPositionX = -0.1; // Natural X position of the head
const nodAmplitudeX = 0.05; // Amplitude for nodding
let nodDirectionY = 0; // Direction for left-right movement

let rightShoulder, leftShoulder;

const blinkInterval = 3000; // Time between blinks in milliseconds
const blinkDuration = 200; // Duration of a blink in milliseconds
const clock = new THREE.Clock();
const loader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const scene = new THREE.Scene();
let renderer;
function App() {
  const containerRef = React.useRef();
  React.useEffect(() => {
    if (containerRef.current) {
      if (renderer) {
        containerRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      }
      const aspectRatio = 16 / 9;
      const width = window.innerWidth;
      const height = width / aspectRatio;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(15, aspectRatio, 0.1, 1000);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      // renderer.setClearColor(0x000000, 0);

      // Update the camera aspect ratio
      camera.aspect = aspectRatio;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(window.devicePixelRatio);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 3, 2); // Adjust the position as needed
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xffffff, 1, 100);
      pointLight.position.set(0, 5, 2); // Adjust the position to focus on the character
      scene.add(pointLight);

      const avatarURL =
        "https://models.readyplayer.me/6370d572777dc969696d3efa.glb";
      loader.load(
        avatarURL,
        function (gltf) {
          const avatar = gltf.scene;
          let leftArmBone, rightArmBone;
          // Compute the bounding box of the avatar
          const bbox = new THREE.Box3().setFromObject(avatar);
          const center = bbox.getCenter(new THREE.Vector3());
          console.log(avatar);
          if (avatar.children[0].children[3].morphTargetInfluences) {
            morphTargetInfluences =
              avatar.children[0].children[3].morphTargetInfluences;
          }

          // Translate the avatar to center it
          avatar.position.x -= center.x;
          avatar.position.y -= center.y - 0.3; // Adjust this if you want the avatar to be on the ground
          avatar.position.z = 0;

          // Traverse the model to find the arm bones
          avatar.traverse(function (object) {
            if (object.isBone) {
              // Replace with the actual names of your arm bones
              if (object.name === "LeftArm") {
                leftArmBone = object;
              } else if (object.name === "RightArm") {
                rightArmBone = object;
              }
            }
          });

          avatar.traverse(function (object) {
            if (object.isBone) {
              // Check if the bone's name matches 'EyeLeft' or 'EyeRight'
              if (object.name === "LeftEye") {
                eyeLeft = object;
                console.log("Found EyeLeft:", object);
              } else if (object.name === "RightEye") {
                eyeRight = object;
                console.log("Found EyeRight:", object);
              }
            }
          });

          avatar.traverse(function (object) {
            if (object.isBone) {
              if (object.name === "RightShoulder") {
                rightShoulder = object;
              } else if (object.name === "LeftShoulder") {
                leftShoulder = object;
              }
            }
          });

          // Check if the shoulder bones were found
          if (rightShoulder && leftShoulder) {
            console.log("Shoulder bones found:", rightShoulder, leftShoulder);
          } else {
            console.log("Shoulder bones not found.");
          }

          avatar.traverse(function (object) {
            if (object.isBone && object.name === "Head") {
              // Replace 'Head' with the actual name of the head bone
              headBone = object;
            }
          });

          // Check if the head bone was found
          if (headBone) {
            console.log("Head bone found:", headBone);
          } else {
            console.log("Head bone not found.");
          }

          // Rotate the arm bones (example values, adjust as needed)
          if (leftArmBone) {
            leftArmBone.rotation.x = Math.PI / 2; // Rotate around the X axis
          }
          if (rightArmBone) {
            rightArmBone.rotation.x = Math.PI / 2; // Rotate around the X axis
          }

          scene.add(avatar);

          // Calculate the distance the camera should be from the avatar
          const size = bbox.getSize(new THREE.Vector3());
          const distance = size.y * 1.5;

          // Position the camera to frame the avatar based on its size
          camera.position.set(0, size.y / 2, distance);
          camera.lookAt(new THREE.Vector3(0, size.y / 2, 2));

          fbxLoader.load(
            "idle.fbx",
            (object) => {
              // Create an AnimationMixer for the object
              const mixer = new THREE.AnimationMixer(avatar);
              console.log(object);
              // Access the animations from the loaded object
              const action = mixer.clipAction(object.animations[0]); // Play the first animation
              action.play();
              // Other setup...
            },
            undefined,
            function (error) {
              console.error(error);
            }
          );
        },
        undefined,
        function (error) {
          console.error(error);
        }
      );

      // Camera position

      containerRef.current.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (mixer) {
          mixer.update(delta);
        }
        blink(); // Update blinking
        simulateTalking(); // Update mouth movement
        nod(); // Update nodding
        animateShoulders();
        renderer.render(scene, camera);
      }
      animate();
      // Handle window resize
      // // Handle window resize
      // window.addEventListener("resize", onWindowResize, false);
      function onWindowResize() {
        const newWidth = window.innerWidth;
        const newHeight = newWidth / aspectRatio;

        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        // renderer.setClearColor(0xffffff, 1);
        renderer.setClearColor(0x000000, 0);
      }
      onWindowResize();

      function blink() {
        const currentTime = Date.now();
        if (currentTime - lastBlinkTime > blinkInterval) {
          // Start a blink
          lastBlinkTime = currentTime;
        }

        if (
          eyeLeft &&
          eyeRight &&
          currentTime - lastBlinkTime < blinkDuration
        ) {
          // During a blink - close the eyes
          const blinkProgress = (currentTime - lastBlinkTime) / blinkDuration;
          const blinkRotation =
            blinkProgress < 0.5 ? blinkProgress * 2 : (1 - blinkProgress) * 2;

          // Adjust these values based on how your model's eyelids are rigged
          eyeLeft.rotation.x = blinkRotation;
          eyeRight.rotation.x = blinkRotation;
        } else {
          // Eyes open
          if (eyeLeft && eyeRight) {
            eyeLeft.rotation.x = 0;
            eyeRight.rotation.x = 0;
          }
        }
      }

      function animateShoulders() {
        const currentTime = Date.now();
        const shoulderMovement = Math.sin(currentTime * 0.002) * 0.004; // Adjust for desired range

        if (rightShoulder) {
          rightShoulder.rotation.y = shoulderMovement;
        }
        if (leftShoulder) {
          leftShoulder.rotation.y = -shoulderMovement; // Opposite direction for natural movement
        }
      }

      function nod() {
        const currentTime = Date.now();
        if (currentTime - lastNodTime > nodInterval) {
          // Start a nod and randomly choose a direction for left-right movement
          lastNodTime = currentTime;
          nodDirectionY = (Math.random() > 0.5 ? 1 : -1) * 0.02; // Randomly choose between -0.02 and 0.02
        }

        if (headBone && currentTime - lastNodTime < nodDuration) {
          // During a nod - nod the head and move left-right
          const nodProgress = (currentTime - lastNodTime) / nodDuration;
          const nodRotationX = Math.sin(nodProgress * Math.PI) * nodAmplitudeX;
          const nodRotationY = Math.sin(nodProgress * Math.PI) * nodDirectionY;

          headBone.rotation.x = naturalHeadPositionX + nodRotationX;
          headBone.rotation.y = nodRotationY;
        } else {
          // Head in neutral position
          if (headBone) {
            headBone.rotation.x = naturalHeadPositionX;
            headBone.rotation.y = 0;
          }
        }
      }

      // Function to simulate talking
      function simulateTalking() {
        if (!morphTargetInfluences) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - lastUpdateTime;

        // Randomly change speed and introduce pauses
        if (currentTime > nextChangeTime) {
          currentSpeed = Math.random(); // Speed of mouth movement
          const pauseDuration = Math.random() * 2000; // Pause duration in milliseconds
          nextChangeTime = currentTime + pauseDuration;
        }

        // Oscillate the influence of the morph targets
        morphTargetInfluences[0] =
          Math.sin(currentTime * 0.015 * currentSpeed) * 0.5 + 0.5;
        morphTargetInfluences[1] =
          Math.cos(currentTime * 0.015 * currentSpeed) * 0.5 + 0.5;

        lastUpdateTime = currentTime;
      }
    }
  }, [containerRef]);

  return <div className="container" ref={containerRef}></div>;
}

export default App;
