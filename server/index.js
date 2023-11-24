const ffmpeg = require("fluent-ffmpeg");

const uploadedFile = "uploads/video.webm";
const introVideo = "public/video/intro.mp4"; // Replace with your intro video path
const outroVideo = "public/video/out.mp4"; // Replace with your outro video path
const outputVideo = "output/video.mp4";

ffmpeg().input(uploadedFile).output(outputVideo).save();
// Stitch videos using FFmpeg
// ffmpeg()
//   .input(introVideo)
//   .input(uploadedFile)
//   .input(outroVideo)
//   .on("end", function () {
//     console.log("Files have been merged successfully");
//   })
//   .on("error", function (err) {
//     console.log("An error occurred: " + err.message);
//   })
//   .mergeToFile(outputVideo, "temp/");
