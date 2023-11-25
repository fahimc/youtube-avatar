import logo from "./logo.svg";
import "./App.css";
import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
const ffmpeg = new FFmpeg();

let morphTargetInfluences;
let mixer;
let lastUpdateTime = 0;
let currentSpeed = 0.5;
let nextChangeTime = 0;
let lastBlinkTime = 0;
let eyeLeft, eyeRight;
let headBone;
let lastNodTime = 0;
let mouthOpenIndex = 0;
let teethMesh;
let wolf3DHeadMesh;
let leftArmBone;
let rightArmBone;
let leftHandBone;
let rightHandBone;
let controls;
let avatar;
let video;
let videoTexture;

let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioSource;
let audioDestination = audioContext.createMediaStreamDestination();
let analyser;
let recorder;
let camera;
const cameraPositions = {
  wide: { position: new THREE.Vector3(0, 0.93, 2.8), duration: 10000 }, // 5 seconds
  closeUp: { position: new THREE.Vector3(0, 1, 2), duration: 10000 }, // 2 seconds
};
let currentCameraPosition = "wide";
let lastCameraChangeTime = Date.now();

let lastArmMoveTime = 0;
const armMoveInterval = 2000; // Time between arm movements in milliseconds

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
let created = false;
let chunks = [];
function App() {
  const containerRef = React.useRef();
  React.useEffect(() => {
    if (containerRef.current && !created) {
      created = true;
      if (renderer) {
        containerRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      }
      const aspectRatio = 16 / 9;
      const width = window.innerWidth;
      const height = width / aspectRatio;
      const scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(15, aspectRatio, 0.1, 1000);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      // renderer.setClearColor(0x000000, 0);

      // Update the camera aspect ratio
      camera.aspect = aspectRatio;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(window.devicePixelRatio);

      const avatarURL =
        "https://models.readyplayer.me/6370d572777dc969696d3efa.glb";
      loader.load(
        avatarURL,
        function (gltf) {
          avatar = gltf.scene;
          let leftArmBone, rightArmBone;
          // Compute the bounding box of the avatar
          const bbox = new THREE.Box3().setFromObject(avatar);
          const center = bbox.getCenter(new THREE.Vector3());

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
                // console.log("Found EyeLeft:", object);
              } else if (object.name === "RightEye") {
                eyeRight = object;
                // console.log("Found EyeRight:", object);
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
            // console.log("Shoulder bones found:", rightShoulder, leftShoulder);
          } else {
            // console.log("Shoulder bones not found.");
          }

          avatar.traverse(function (object) {
            if (object.isBone && object.name === "Head") {
              // Replace 'Head' with the actual name of the head bone
              headBone = object;
            }
          });

          // Check if the head bone was found
          if (headBone) {
            // console.log("Head bone found:", headBone);
          } else {
            // console.log("Head bone not found.");
          }

          // Rotate the arm bones (example values, adjust as needed)
          if (leftArmBone) {
            leftArmBone.rotation.x = Math.PI / 2; // Rotate around the X axis
          }
          if (rightArmBone) {
            rightArmBone.rotation.x = Math.PI / 2; // Rotate around the X axis
          }

          avatar.traverse(function (object) {
            if (object.name === "Wolf3D_Teeth") {
              teethMesh = object;
              mouthOpenIndex = object.morphTargetDictionary["mouthOpen"];
            }
          });

          // Check if the teeth bone was found
          if (teethMesh) {
            // console.log("Teeth bone found:", teethMesh);
          } else {
            // console.log("Teeth bone not found.");
          }

          avatar.traverse(function (object) {
            if (object.name === "Wolf3D_Head") {
              wolf3DHeadMesh = object;
            }
          });

          avatar.traverse(function (object) {
            if (object.isBone) {
              switch (object.name) {
                case "LeftArm":
                  leftArmBone = object;
                  break;
                case "RightArm":
                  rightArmBone = object;
                  break;
                case "LeftHand":
                  leftHandBone = object;
                  break;
                case "RightHand":
                  rightHandBone = object;
                  break;
              }
            }
          });

          const loader = new THREE.TextureLoader();
          const bgTexture = loader.load("bg.png"); // Replace with your image path
          scene.background = bgTexture;

          scene.add(avatar);

          // Lighting
          const ambientLight = new THREE.AmbientLight(0xffffff, 1);
          scene.add(ambientLight);

          const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
          directionalLight.position.set(5, 3, 2); // Adjust the position as needed
          scene.add(directionalLight);

          const pointLight = new THREE.PointLight(0xffffff, 1, 100);
          pointLight.position.set(0, 5, 0); // Adjust the position to focus on the character
          scene.add(pointLight);

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

      containerRef.current.appendChild(renderer.domElement);
      // ... after setting up audioSource

      controls = new OrbitControls(camera, renderer.domElement);

      // videoTexture.format = THREE.RGBFormat;

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (mixer) {
          mixer.update(delta);
        }
        blink(); // Update blinking
        // simulateTalking(); // Update mouth movement
        nod(); // Update nodding
        animateShoulders();
        animateArms();
        updateCameraPosition(); // Update camera position based on timing
        if (analyser) {
          let dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);

          let averageVolume = getAverageVolume(dataArray);

          // Map the average volume to the mouth's open scale
          let mouthScale = mapVolumeToMouthScale(averageVolume);
          simulateTalking(mouthScale);
          // Apply this scale to the mouth bone or morph target
          // For example, if using a morph target:
          // mesh.morphTargetInfluences[mouthOpenIndex] = mouthScale;
        }

        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          videoTexture.needsUpdate = true;
        }

        renderer.render(scene, camera);
      }
      animate();
      // Handle window resize
      // // Handle window resize
      window.addEventListener("resize", onWindowResize, false);
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
        const shoulderMovement = Math.sin(currentTime * 0.002) * 0.01; // Adjust for desired range

        if (rightShoulder) {
          rightShoulder.rotation.y = shoulderMovement;
        }
        if (leftShoulder) {
          leftShoulder.rotation.y = -shoulderMovement; // Opposite direction for natural movement
        }
      }

      function animateArms() {
        const currentTime = Date.now();
        if (currentTime - lastArmMoveTime > armMoveInterval) {
          lastArmMoveTime = currentTime;

          // Randomize arm movement
          const leftArmRotation = Math.random() * 0.1 - 0.05; // Random rotation between -0.05 and 0.05 radians
          const rightArmRotation = Math.random() * 0.1 - 0.05;

          // Apply rotation to arm bones
          if (leftArmBone) {
            leftArmBone.rotation.x += leftArmRotation;
          }
          if (rightArmBone) {
            rightArmBone.rotation.x += rightArmRotation;
          }

          // Reset rotation after a short duration
          setTimeout(() => {
            if (leftArmBone) {
              leftArmBone.rotation.x -= leftArmRotation;
            }
            if (rightArmBone) {
              rightArmBone.rotation.x -= rightArmRotation;
            }
          }, 500);
        }
      }

      function updateCameraPosition() {
        const currentTime = Date.now();
        const currentSetting = cameraPositions[currentCameraPosition];
        const elapsedTime = currentTime - lastCameraChangeTime;
        if (elapsedTime > currentSetting.duration) {
          lastCameraChangeTime = currentTime;
          // Switch camera position
          currentCameraPosition =
            currentCameraPosition === "wide" ? "closeUp" : "wide";
          // Update camera position
        }
        const newPosition = cameraPositions[currentCameraPosition].position;
        camera.position.set(newPosition.x, newPosition.y, newPosition.z);
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
      function simulateTalking(_openAmount) {
        const currentTime = Date.now();

        // Simulate mouth movement - this is just an example
        // Replace this with your actual logic for mouth movement
        const openAmount =
          _openAmount !== undefined
            ? _openAmount
            : Math.sin(currentTime * 0.005) * 0.5 + 0.5; // Oscillates between 0 and 1

        // Animate the mouth opening on the "Wolf3D_Head" mesh
        if (
          wolf3DHeadMesh &&
          wolf3DHeadMesh.morphTargetInfluences &&
          wolf3DHeadMesh.morphTargetDictionary
        ) {
          const mouthOpenIndex =
            wolf3DHeadMesh.morphTargetDictionary["mouthOpen"];
          if (mouthOpenIndex !== undefined) {
            wolf3DHeadMesh.morphTargetInfluences[mouthOpenIndex] = openAmount;
          }
        }

        // Animate the teeth opening
        if (
          teethMesh &&
          teethMesh.morphTargetInfluences &&
          teethMesh.morphTargetDictionary
        ) {
          const teethMouthOpenIndex =
            teethMesh.morphTargetDictionary["mouthOpen"];
          if (teethMouthOpenIndex !== undefined) {
            teethMesh.morphTargetInfluences[teethMouthOpenIndex] = openAmount;
          }
        }
      }
      function getAverageVolume(array) {
        let values = 0;
        let average;

        let length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }

        average = values / length;
        return average;
      }

      function mapVolumeToMouthScale(volume) {
        // Map the volume to a scale of 0 to 1 (or whatever scale your model uses)
        // This will likely require some tweaking
        let minVolume = 0; // Minimum observed volume
        let maxVolume = 128; // Maximum observed volume

        return (volume - minVolume) / (maxVolume - minVolume);
      }
    }
  }, [containerRef]);

  function minutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
  }

  return (
    <>
      <div className="container" ref={containerRef}></div>
      <button
        onClick={() => {
          if (audioContext.state === "suspended") {
            audioContext.resume();
          }

          // Load and play the audio as before
          fetch("voice.mp3")
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
            .then((audioBuffer) => {
              audioSource = audioContext.createBufferSource();
              audioSource.buffer = audioBuffer;
              analyser = audioContext.createAnalyser();
              audioSource.connect(audioDestination);
              audioSource.connect(analyser);
              analyser.connect(audioContext.destination);
              audioSource.onended = () => {
                setTimeout(() => {
                  recorder.stop();
                  console.log("recorder stop");
                }, 1000); // Stop recording 3 seconds after audio ends
              };

              const canvas = renderer.domElement;
              // console.log(renderer);
              // var gl = renderer.getContext(); //get webGl context
              // var canvas = gl.canvas;
              const canvasStream = canvas.captureStream(25); // 25 FPS, adjust as needed

              canvasStream.addTrack(
                audioDestination.stream.getAudioTracks()[0]
              );
              const combinedStream = new MediaStream([
                canvasStream.getVideoTracks()[0],
                audioDestination.stream.getAudioTracks()[0],
              ]);
              console.log("recorder created");
              recorder = new MediaRecorder(combinedStream, {
                mimeType: "video/webm",
              });

              recorder.ondataavailable = (event) => {
                chunks.push(event.data);
                console.log(event.data.size);
                if (event.data.size > 0) {
                }
              };

              recorder.onstop = async () => {
                console.log("recorder end event");
                const blob = new Blob(chunks, { type: "video/webm" });
                const url = URL.createObjectURL(blob);

                const baseURL =
                  "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd";
                await ffmpeg.load({
                  coreURL: await toBlobURL(
                    `${baseURL}/ffmpeg-core.js`,
                    "text/javascript"
                  ),
                  wasmURL: await toBlobURL(
                    `${baseURL}/ffmpeg-core.wasm`,
                    "application/wasm"
                  ),
                });
                ffmpeg.on("log", ({ message }) => {
                  console.log(message);
                });
                await ffmpeg.writeFile("input.webm", await fetchFile(url));
                await ffmpeg.writeFile(
                  "intro.mp4",
                  await fetchFile("/video/intro.mp4")
                );
                await ffmpeg.writeFile(
                  "out.mp4",
                  await fetchFile("/video/out.mp4")
                );
                await ffmpeg.exec([
                  "-i",
                  "input.webm",
                  "-vf",
                  "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                  "input.mp4",
                ]);
                const timestamp = new Date().getTime();

                const inputPaths = [
                  "file intro.mp4",
                  "file input.mp4",
                  "file out.mp4",
                ];
                await ffmpeg.writeFile(
                  "concat_list.txt",
                  inputPaths.join("\n")
                );

                await ffmpeg.exec([
                  "-f",
                  "concat",
                  "-safe",
                  "0",
                  "-i",
                  "concat_list.txt",
                  "-vf",
                  "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                  `output-${timestamp}.mp4`,
                ]);
                const ffdata = await ffmpeg.readFile(`output-${timestamp}.mp4`);
                const ffurl = URL.createObjectURL(
                  new Blob([ffdata.buffer], { type: "video/mp4" })
                );
                // Create a download link
                const a = document.createElement("a");
                a.href = ffurl;
                a.download = `output.mp4`;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                window.URL.revokeObjectURL(ffurl);
                document.body.removeChild(a);
              };
              // Assuming you have a way to detect when the audio ends
              recorder.start();
              audioSource.start();
            })
            .catch((e) => console.error(e));
        }}
      >
        start
      </button>
    </>
  );
}

export default App;
