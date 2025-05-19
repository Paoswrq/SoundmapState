// Import microphone analysis and audio data functions
import { startMicrophoneAnalysis, getAudioData } from "./core.js";

// Import visual modules
import { loopWave } from "./WaveForm.js";
import { loopFireWork } from "./FireBrust.js";
import { Block, disposeBlock } from "./New3dblock.js";

// Track which visual modules are available
let listofModules = [window.waveformactive, window.fireworkactive, window.blocksactive];
let currentmodule = 0;

// List of functions to run each visual
let listofFunctions = [loopWave, loopFireWork, Block];

// Get the canvas element where visuals are drawn
let canvasHtml = document.getElementById("canvas"); 

// Start listening to microphone input, then begin detection loop
startMicrophoneAnalysis().then(() => {
    detectSwitch();
});

let maxLoudness = 50;         // Loudness threshold to trigger a switch
let lastSwitchTime = -1;      // Time when loud sound was last detected
let index = 1;                // Index for the next visual module

// Continuously check audio input to switch visuals based on loudness
function detectSwitch() {
    let dataArray = getAudioData();

    if (!dataArray || dataArray.length === 0) {
        requestAnimationFrame(detectSwitch); // Retry next frame
        return; 
    }

    // Calculate root mean square (RMS) loudness from audio data
    let sum = 0; 
    for(let i = 0; i < dataArray.length; i++) {
        let amplitude = dataArray[i] - 128; 
        sum += amplitude * amplitude;
    }
    let rms = Math.sqrt(sum / dataArray.length);
    let loudness = 6 + 20 * Math.log10(rms); // Convert to dB

    // If loudness passes threshold, record the time
    if(loudness > maxLoudness) {
        lastSwitchTime = Date.now(); 
    }

    // If no loud sound for 10 seconds, switch to next visual
    if(Date.now() - lastSwitchTime > 10000) {
        Switch(index);
        if(index === listofModules.length) {
          index = 1; 
        }
        else {
          index++; 
        }
    }

    requestAnimationFrame(detectSwitch); // Loop
}

// Allow manual switching between visuals with keys 1, 2, or 3
document.addEventListener("keydown", function(evt) {
  switch (evt.key) {
    case "1": 
      Switch(1); 
      break;
    case "2": 
      Switch(2); 
      break;
    case "3": 
      Switch(3); 
      break;
}}) 

// Switches to the selected visual mode (1: waveform, 2: fireworks, 3: 3D blocks)
function Switch(i) {
    cancelAnimationFrame(window.animationFrameId); // Stop current animation
    if(i != 3) disposeBlock(); // Clean up 3D blocks if switching away

    if (i == 1) {
      canvasHtml.style.display = "block"; 
      window.activemodule = "wave";
      loopWave(); // Start waveform visual
    } 
    else if (i == 2) {
      canvasHtml.style.display = "block"; 
      window.activemodule = "firework";
      loopFireWork(); // Start fireworks visual
    }
    else if (i == 3) {
      canvasHtml.style.display = "none"; 
      window.activemodule = "block";
      Block(); // Start 3D block visual
    }

    lastSwitchTime = Date.now(); 
    console.log("Switched to:", i);
}