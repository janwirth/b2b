import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";

const Config = {
  followNewTab: true,
  fps: 25,
  // ffmpeg_Path: "<path of ffmpeg_path>" || null,
  videoFrame: {
    width: 1024,
    height: 768,
  },
  videoCrf: 18,
  videoCodec: "libx264",
  videoPreset: "ultrafast",
  videoBitrate: 1000,
  // autopad: {
  //   color: "black" | "#35A5FF",
  // },
  aspectRatio: "4:3",
};
import puppeteer from "puppeteer";
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

const recorder = new PuppeteerScreenRecorder(page);
const savePath = "./test/demo.mp4";
await page.goto("http://localhost:3000");
await recorder.start(savePath);
console.log("Started recorder");
await new Promise((resolve) => setTimeout(resolve, 2000));
await recorder.stop();
await browser.close();
