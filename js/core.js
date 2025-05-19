let currentcolor = [255, 0, 0];
let targetcolor = [255, 0, 0];

let audioContext;
let analyser;
let source;
let dataArray;
let frequencyData;
let returnHue = 10;
let loudness = null;
let lastHue = 0;
let hue = 0;
let frequency = 0;

window.addEventListener("resize", canvasUpdate); 

export function startMicrophoneAnalysis() {
  return navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      dataArray = new Uint8Array(analyser.fftSize);
      frequencyData = new Uint8Array(analyser.frequencyBinCount);

      source.connect(analyser);

      updateData();
    })
    .catch(function (err) {
      console.error('Microphone access error:', err);
    });
}

function canvasUpdate() {
  let canvas = document.getElementById("canvas");
  let canvasContext = canvas.getContext("2d");
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.style.display = "block";  
}
canvasUpdate();

let noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
let noteStringToValue = [32.70, 34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74];
function noteFromPitch(frequency) {
  if(frequency === -1) return 0;  
  let noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
  return Math.round( noteNum ) + 69;
}

let lastOctave = 1; 
function octaveFromPitch(frequency) {
  if(frequency === -1) return lastOctave;  
  let count = 1; 
  for(let i = 32.70; i < frequency; ) {
    count++; 
    i *= 2;
  }
  lastOctave = count;
  return count; 
}

function determineValue(n, value) {
  if(value === -1) return noteStringToValue[0];
  if(n === 1) return value; 
  return value * (Math.pow(2, n-1));
}

function updateData() {
  analyser.getByteTimeDomainData(dataArray);
  analyser.getByteFrequencyData(frequencyData);

  let buffer = new Float32Array(analyser.fftSize);

  analyser.getFloatTimeDomainData(buffer);

  let autoCorrelateValue = autoCorrelate(buffer, audioContext.sampleRate);
  let noteValue = noteStringToValue[noteFromPitch(autoCorrelateValue) % 12];
  let octaveValue = octaveFromPitch(autoCorrelateValue); 
  let pitch = determineValue(octaveValue, noteValue);

  returnHue = getPitchAndMapToHue(pitch);
  loudness = calculateLoudness(dataArray);

	const dataArray2 = new Uint8Array(analyser.fftSize);
	analyser.getByteFrequencyData(dataArray2);
  getPitchAndMap(dataArray2, audioContext.sampleRate);

  requestAnimationFrame(updateData);
}


// Credit to https://alexanderell.is/posts/tuner/tuner.js and https://github.com/cwilso/PitchDetect/pull/23
function autoCorrelate(buffer, sampleRate) {
  // Perform a quick root-mean-square to see if we have enough signal
  var SIZE = buffer.length;
  var sumOfSquares = 0;
  for (var i = 0; i < SIZE; i++) {
    var val = buffer[i];
    sumOfSquares += val * val;
  }
  var rootMeanSquare = Math.sqrt(sumOfSquares / SIZE)
  if (rootMeanSquare < 0.01) {
    return -1;
  }

  // Find a range in the buffer where the values are below a given threshold.
  var r1 = 0;
  var r2 = SIZE - 1;
  var threshold = 0.2;

  // Walk up for r1
  for (var i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }

  // Walk down for r2
  for (var i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  // Trim the buffer to these ranges and update SIZE.
  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length

  // Create a new array of the sums of offsets to do the autocorrelation
  var c = new Array(SIZE).fill(0);
  // For each potential offset, calculate the sum of each buffer value times its offset value
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j+i]
    }
  }

  // Find the last index where that value is greater than the next one (the dip)
  var d = 0;
  while (c[d] > c[d+1]) {
    d++;
  }

  // Iterate from that index through the end and find the maximum sum
  var maxValue = -1;
  var maxIndex = -1;
  for (var i = d; i < SIZE; i++) {
    if (c[i] > maxValue) {
      maxValue = c[i];
      maxIndex = i;
    }
  }

  var T0 = maxIndex;

  // From the original author(cwilso):
  // interpolation is parabolic interpolation. It helps with precision. We suppose that a parabola pass through the
  // three points that comprise the peak. 'a' and 'b' are the unknowns from the linear equation system and b/(2a) is
  // the "error" in the abscissa. Well x1,x2,x3 should be y1,y2,y3 because they are the ordinates.
  var x1 = c[T0 - 1];
  var x2 = c[T0];
  var x3 = c[T0 + 1]

  var a = (x1 + x3 - 2 * x2) / 2;
  var b = (x3 - x1) / 2
  if (a) {
    T0 = T0 - b / (2 * a);
  }

  return sampleRate/T0;
}

function getPitchAndMapToHue(pitch) {
  if (pitch === -1) return lastHue;

  if (pitch < 62) hue = mapFrequencyToHue(pitch, 2, 62, 0, 10); // red
  else if (pitch < 124) hue = mapFrequencyToHue(pitch, 62, 124, 10, 30); // orange 
  else if (pitch < 248) hue = mapFrequencyToHue(pitch, 124, 248, 30, 60); // yellow 
  else if (pitch < 494) hue = mapFrequencyToHue(pitch, 248, 494, 60, 120); // green 
  else if (pitch < 988) hue = mapFrequencyToHue(pitch, 494, 988, 120, 180); // cyan 
  else if (pitch < 1976) hue = mapFrequencyToHue(pitch, 988, 1976, 180, 240); // blue 
  else if (pitch < 3952) hue = mapFrequencyToHue(pitch, 1976, 3952, 240, 300); // purple 
  else if (pitch < 7904) hue = mapFrequencyToHue(pitch, 3952, 7904, 300, 360); // violet 
  else hue = mapFrequencyToHue(pitch, 1, 5000, 0, 360);

  lastHue += (hue - lastHue) * 1;
  return lastHue;
}

function mapFrequencyToHue(frequency, minFrequency, maxFrequency, startingHue, endingHue) {
  const clamped = Math.min(Math.max(frequency, minFrequency), maxFrequency);
  const x = (clamped - minFrequency) / (maxFrequency - minFrequency);
  return startingHue + (endingHue - startingHue) * x;
}

function calculateLoudness(dataArray) {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    let amp = dataArray[i] - 128;
    sum += amp * amp;
  }
  let rms = Math.sqrt(sum / dataArray.length);
  return 6 + 20 * Math.log10(rms);
}

function getPitchAndMap(buffer, sampleRate) {
	const colors = [[0, 0, 100], [50, 250, 50], [255, 255, 0]];
	let maxIndex = -1;
	let maxValue = -1;
	let transition_speed = 0.05;

	for (let i = 0; i < buffer.length; i++) {
		if (buffer[i] > maxValue) {
			maxValue = buffer[i];
			maxIndex = i;
		}
	}

	// Convert the index to a frequency
	const nyquist = sampleRate / 2;
	frequency = (maxIndex / buffer.length) * nyquist;

	const minFrequency = 100; 
	const maxFrequency = 1000; 

	if (frequency < minFrequency) {
		transition_speed = 0.1;
		targetcolor = [150,150,150];
	}
	else {
		frequency = Math.max(Math.min(frequency, maxFrequency), minFrequency);
		if (frequency < 130) targetcolor = colors[0];
		else if (frequency < 400) targetcolor = colors[1];
		else targetcolor = colors[2];
	}

	currentcolor[0] += ((targetcolor[0] - currentcolor[0]) * transition_speed);
	currentcolor[1] += ((targetcolor[1] - currentcolor[1]) * transition_speed);
	currentcolor[2] += ((targetcolor[2] - currentcolor[2]) * transition_speed);
}

export function getAudioData() {
  if (analyser) analyser.getByteTimeDomainData(dataArray);
  return dataArray;
}

export function getAudioDataFrequency() {
  if (analyser) {
    analyser.getByteFrequencyData(frequencyData);
    return frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
  }
  return 0;
}

export function getPitch() {
  return {color: currentcolor, pitch: frequency};
}

export function getLoudness() {
  return loudness;
}

let box = document.getElementById("instructionBox");
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

box.addEventListener("mousedown", (e) => {
  isDragging = true;
  box.classList.add("dragging");
  offsetX = e.clientX - box.offsetLeft;
  offsetY = e.clientY - box.offsetTop;
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const newLeft = Math.max(0, Math.min(window.innerWidth - box.offsetWidth, e.clientX - offsetX));
    const newTop = Math.max(0, Math.min(window.innerHeight - box.offsetHeight, e.clientY - offsetY));
    box.style.left = `${newLeft}px`;
    box.style.top = `${newTop}px`;
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  box.classList.remove("dragging");
});

// Show/hide popup
function openInstructionOverlay() {
  document.getElementById("instructionBg").style.display = "flex";
}

function closeInstructionOverlay() {
  document.getElementById("instructionBg").style.display = "none";
}

document.getElementById("Exit").addEventListener("click", closeInstructionOverlay);
document.getElementById("moreBtn").addEventListener("click", openInstructionOverlay);

window.onload = startMicrophoneAnalysis();
