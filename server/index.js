const ffmpeg = require("fluent-ffmpeg");

const uploadedFile = "uploads/video.webm";
const introVideo = "public/video/intro.mp4"; // Replace with your intro video path
const outroVideo = "public/video/out.mp4"; // Replace with your outro video path
const outputVideo = "output/video.mp4";

// ffmpeg()
//   .input(introVideo)
//   .input(outputVideo)
//   .input(outroVideo)
//   .size("1920x1080")
//   //   .output("output/merged.mp4")
//   // Stitch videos using FFmpeg
//   // ffmpeg()
//   //   .input(uploadedFile)
//   //   .on("end", function () {
//   //     console.log("Files have been merged successfully");
//   //   })
//   .on("error", function (err) {
//     console.log("An error occurred: " + err.message);
//   })
//   .mergeToFile("output/merged.mp4", "temp/");
// //   .run();

// ffmpeg("list.txt")
//   .inputOptions(["-f concat", "-safe 0", "-async 1"])
//   .outputOptions(["-c copy"])
//   .videoCodec("libx264")
//   .audioBitrate(128)
//   .fps(30)
//   .audioFrequency(22050)
//   .on("end", () => console.log("DONE"))
//   .save("video.mp4");
ffmpeg()
  .input(introVideo)
  .outputOptions(["-c copy"])
  .output("output/intro.ts")
  .run();

ffmpeg()
  .input(outputVideo)
  .outputOptions(["-c copy"])
  .output("output/input.ts")
  .run();
ffmpeg()
  .input("output/intro.ts")
  .input("output/input.ts")
  .mergeToFile("output/merged.mp4", "temp/");
