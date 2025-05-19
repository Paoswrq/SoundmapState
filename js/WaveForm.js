import { getAudioData, getPitch} from "./core.js";

export function loopWave() {
    let currentcolor = getPitch().color; 
    let dataArray = getAudioData();

    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgb(" + currentcolor[0] + ", " + currentcolor[1] + ", " + currentcolor[2] + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let waveConfig = [
        {multiplier: 0.02, height: .80 }
    ];

    waveConfig.forEach(({multiplier, height }) => {
        ctx.beginPath();

        let sliceWidth = canvas.width / dataArray.length;
        let x = 0;
        let previousX = 0; 
        let previousY = 0; 
        
        let oppositeRGB = [255-currentcolor[0], 255-currentcolor[1], 255-currentcolor[2]]; 

        for (let i = 0; i < dataArray.length; i++) {
          let v = (dataArray[i] - 128) / 128; 
          let y = (0.5 + v * 0.5 * height) * canvas.height; 


          if (i === 0) {
              ctx.moveTo(x, y);
          } else {
            let cp1x = (previousX + x) / 2;
            let cp1y = previousY; 
            let cp2x = (previousX + x) / 2;
            let cp2y = y;   
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
          }
          
          previousY = y;
          previousX = x;
          
          x += sliceWidth;
        }

        ctx.strokeStyle = "rgb(" + oppositeRGB[0] + ", " + oppositeRGB[1] + ", " + oppositeRGB[2] + ")";;
        ctx.lineWidth = 5; 
        ctx.stroke();
    });
    if(window.activemodule == "wave") {
      	window.animationFrameId = requestAnimationFrame(loopWave);
    }
}