const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const buttonsDiv = document.getElementById('exercises-div');
const instructionBox = document.getElementById('instruction-box');
const instructionMessage = document.getElementById('extensive-instruction');

window.onload = () =>{
    init();
}

let videoRenderCanvas = document.createElement('canvas');
let videoRenderCanvasCtx = videoRenderCanvas.getContext('2d');

function init(){
    // closeTutorial();
    const enableWebcam = document.getElementById('enable-webcam');

    enableWebcam.addEventListener('click', async()=>{
        if (gotUserMedia) {
            canvas.style.display = 'block';
            video.style.display = 'block';
            enableWebcam.style.display = 'none';

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRenderCanvas.width = video.width;
            videoRenderCanvas.height = video.height;
            video.srcObject = stream; 
            video.addEventListener('play', loadModel);
        }
    });
}

function closeTutorial(){
    const closeTutorialButton = document.getElementById('close-tutorial-overlay');
    closeTutorialButton.addEventListener('click', ()=>{
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        tutorialOverlay.style.width = '0%';
        tutorialOverlay.style.display = 'none';
    })
}

function gotUserMedia(){
    return !!(navigator.mediaDevices.getUserMedia);
}

let net;
let nn; //neural network
const bodyPixProperties = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 1,
    quantBytes: 4
};
let modelLoadDone = false;

async function loadModel(){
    const poseNet = ml5.poseNet(video, modelHasLoaded);
    poseNet.on('pose', posesDetected);
    net = await bodyPix.load(bodyPixProperties);
    modelLoadDone = true;
    let nnProperties = {
        debug: true,
        task: 'classification',
        inputs: 34,
        outputs: 1
    }
    nn = ml5.neuralNetwork(nnProperties);
    // nn.loadData('models/curl/curl.json', trainData);
    const modelDetails = {
        model: '../models/model.json',
        metadata: '../models/model_meta.json',
        weights:'../models/model.weights.bin'
    }
    nn.load(modelDetails, nnHasLoaded);
    predictBodyPart();
}

let partSegmentation;

const colorMap = [
    {r: 22, g: 127, b: 175, a:0}, 
    {r: 22, g: 127, b: 175, a:0}, 
    {r: 255, g: 57, b: 76, a:0}, 
    {r: 233, g: 30, b: 99, a:0}, 
    {r: 255, g: 57, b: 76, a:0},
    {r: 233, g: 30, b: 99, a:0}, 
    {r: 176, g: 84, b: 255, a:0}, 
    {r: 136, g: 14, b: 79, a:0},
    {r: 176, g: 84, b: 255, a:0}, 
    {r: 136, g: 14, b: 79, a:0}, 
    {r: 156, g: 39, b: 176, a:0},
    {r: 156, g: 39, b: 176, a:0},
    {r: 46, g: 144, b: 242, a:0}, 
    {r: 46, g: 144, b: 242, a:0},
    {r: 91, g: 219, b: 68, a:0}, 
    {r: 91, g: 219, b: 68, a:0},
    {r: 255, g: 222, b: 36, a:0}, 
    {r: 255, g: 222, b: 36, a:0}, 
    {r: 13, g: 71, b: 161, a:0}, 
    {r: 13, g: 71, b: 161, a:0},
    {r: 0, g: 96, b: 100, a:0},  
    {r: 0, g: 188, b: 212, a:0}, 
    {r: 255, g: 193, b: 7, a:0}, 
    {r: 255, g: 193, b: 7, a:0}
];

const colorMapPerExercise = {curl:[2,13],
    pushup:[2,17],
    squat:[14,23]
}

const segmentationProperties = {
    flipHorizontal: false,
    internalResolution: 'medium',
    segmentationThreshold: 0.7
}

let startIdx = 0;
let endIdx = 24;


async function predictBodyPart(){
    videoRenderCanvasCtx.drawImage(video, 0, 0);
    partSegmentation = await net.segmentPersonParts(videoRenderCanvas, segmentationProperties);
    // console.log('part segmentation:\n',partSegmentation);
    drawToCanvas();
    window.requestAnimationFrame(predictBodyPart);
}

// TODO: 
// - load json trained data accordingly based on which button gets clicked
let currentPickedExercise;
let exercisesDiv = document.getElementById('exercises-div');
function handleClick(){
    exercisesDiv.addEventListener('click', ()=>{
        if (!event.target.classList.contains('exercise-options')) return;
        event.target.classList.add('active');
        let buttons = document.querySelectorAll('.exercise-options');
        Array.from(buttons).forEach(button=>{
            if(button === event.target){
                console.log(button.dataset.exercise, 'clicked');
                currentPickedExercise = button.dataset.exercise;
                if(currentPickedExercise === 'curl'){
                    for(let i=0; i<colorMap.length; i++){
                        if(i >= colorMapPerExercise.curl[0] && i <= colorMapPerExercise.curl[1]){
                            colorMap[i].a = 255
                        }
                        else{
                            colorMap[i].a = 0;
                        }
                    }
                }
                else if(currentPickedExercise === 'pushup'){
                    for(let i=0; i<colorMap.length; i++){
                        if(i >= colorMapPerExercise.pushup[0] && i <= colorMapPerExercise.pushup[1]){
                            colorMap[i].a = 255
                        }
                        else{
                            colorMap[i].a = 0;
                        }
                    }
                }
                else if(currentPickedExercise === 'squat'){
                    for(let i=0; i<colorMap.length; i++){
                        if(i >= colorMapPerExercise.squat[0] && i <= colorMapPerExercise.squat[1]){
                            colorMap[i].a = 255
                        }
                        else{
                            colorMap[i].a = 0;
                        }
                    }
                }
                return;
            }
            button.classList.remove('active');
        });
    });
}


function modelHasLoaded(){
    console.log('Model ready!');
    //add raw data
    // collectDataState();
}

function nnHasLoaded(){
    console.log('NN ready!');
    classifyPose();
    buttonsDiv.style.display = 'block';
    instructionBox.style.display = 'block';
    handleClick();
    writeToCanvas();
}


let pose;
function posesDetected(poses){
    if(poses.length > 0){
        pose = poses[0].pose;
        //add raw data
        // if(state === 'collecting'){
        //     console.log('collecting!!!');
        //     let bodyPart={};
        //     for(let i=0; i<pose.keypoints.length; i++){
        //         let x = pose.keypoints[i].position.x;
        //         let y = pose.keypoints[i].position.y;
        //         let partLabel = pose.keypoints[i].part;
        //         bodyPart[partLabel] = {'x':x, 'y':y};
        //     }
        //     let labelOutput = ['curl,peak-shrug-left'];
        //     nn.addData(bodyPart, labelOutput);
        // }
    }
    // console.log(pose);
}

let state = 'waiting';
let initialLabel;
let peakLabel;

const timeout = ms => new Promise(resolve => setTimeout(resolve,ms));

async function collectDataState(){
    console.log('current state: ', state);
    await timeout(8000);
    state='collecting';
    console.log('current state: ', state);
    await timeout(11000);
    console.log(state,' state done');
    state='waiting';
    console.log(`current state: ${state}`);
    document.addEventListener('keydown', event=>{
        // console.log(event);
        if(event.key=='s'){
            console.log('saving data');
            nn.saveData();
        }
    });
}

function trainData(){
    nn.normalizeData();
    console.log('training data...');
    const trainProperties = {
        epochs:300,
    }
    nn.train(trainProperties, doneTraining);
}

function doneTraining(){
    console.log('training complete');
    nn.save();
}

function classifyPose(){
    if(pose){
        let inputs=[];
        for(let i=0; i<pose.keypoints.length; i++){
            let x = pose.keypoints[i].position.x;
            let y = pose.keypoints[i].position.y;
            inputs.push(x);
            inputs.push(y);
        }
        nn.classify(inputs, gotResult);
    }
    setTimeout(classifyPose,100);
}

let instruction = 'Hey there, buddy!';
let extensiveInstruction;
let userForm;

function gotResult(err, res){
    if(err){
        console.log(err);
        return;
    }
    // console.log(res);
    let confidence = res[0].confidence;
    let estimatedForm;
    if(confidence > 0.8){
        // instruction = res[0].label;
        userForm = res[0].label;
        estimatedForm = userForm.split(',')[1];
        // console.log(`form: ${userForm}; confidence: '${confidence}`);
        if(currentPickedExercise === 'curl'){
            curlFormFixer(estimatedForm);
            window.requestAnimationFrame(writeToCanvas);
        }
        else if(currentPickedExercise === 'pushup'){
            pushupFormFixer(estimatedForm);
            window.requestAnimationFrame(writeToCanvas);
        }
        else if(currentPickedExercise === 'squat'){
            squatFormFixer(estimatedForm);
            window.requestAnimationFrame(writeToCanvas);
        }
        // console.log('estimatedForm = ',estimatedForm);
    }
}

function pushupFormFixer(estimatedForm){
    instruction = 'Feature coming soon!'
    extensiveInstruction = 'This feature is not available yet.';
    instructionMessage.innerText = extensiveInstruction;
    instructionBox.classList.remove('wrongForm');
    instructionBox.classList.remove('correctForm');
}
function squatFormFixer(estimatedForm){
    instruction='Feature coming soon!'
    extensiveInstruction = 'This feature is not available yet.';
    instructionMessage.innerText = extensiveInstruction;
    instructionBox.classList.remove('wrongForm');
    instructionBox.classList.remove('correctForm');
}

function curlFormFixer(estimatedForm){
    console.log(estimatedForm);
    let pointOfExercise = estimatedForm.split('-')[0];
    console.log(pointOfExercise);
    let direction = estimatedForm.split('-')[1];
    let form = direction.split('_')[0];
    if(pointOfExercise ==='initial'){
        if(form==='slouch'){
            instruction = 'Keep your back straight at all times!'; 
            extensiveInstruction = 'Don\'t slouch! That may affect your posture, specifically your anterior delt to be rolled forward. Make sure to keep your back straight and shoulders at all times.';
            // console.log('Keep your back straight at all times!');
        }
        else if(form==='correct'){
            instruction = 'Nice form.';
            extensiveInstruction = 'Awesome! Maintain that form!';
            // console.log('Nice form. Maintain that.');
        }
        else if(form==='arch'){
            instruction = 'Don\'t arch to much, stand up right.'; 
            // console.log('Don\'t arch to much, stand up right.');
            extensiveInstruction = 'Keep your back straight and neutral before curling.'
        }
    }
    else if(pointOfExercise==='peak'){
        if(form==='slouch'){
            // console.log('Keep your back straight at all times!');
            instruction='Keep your back straight at all times!';
            extensiveInstruction = 'Don\'t slouch! That may affect your posture, specifically your anterior delt to be rolled forward. Make sure to keep your back straight and shoulders at all times.';
        }
        else if(form==='correct'){
            instruction='Nice form!';
            extensiveInstruction = 'Great! Maintain that form!';
            // console.log('Nice form. Maintain that.');
        }
        else if(form==='arch'){
            instruction = 'Don\'t arch to much, stand up right.';
            // console.log('Don\'t arch to much, stand up right.');
            extensiveInstruction = 'Arching on peak contraction could potentially injure your lower back. Make sure to control the rep and keep your back straight.'
        }
        else{//elbow moved
            instruction = 'Don\'t move your elbow.'
            // console.log('Make sure to keep your elbow stay and put it out of the equation from the exercise');
            extensiveInstruction = 'Make sure to keep your elbow stay through the entire rep.';
        }
    }
    instructionMessage.innerText = extensiveInstruction;
    if(form === 'correct'){
        instructionBox.classList.remove('wrongForm');
        instructionBox.classList.add('correctForm');
    }
    else{
        instructionBox.classList.remove('correctForm');
        instructionBox.classList.add('wrongForm');
    }
}

let toWriteCanvas = document.createElement('canvas');
function writeToCanvas(){
    let liveView = document.getElementById('liveView');
    toWriteCanvas.width = video.width;
    toWriteCanvas.height = video.height;
    toWriteCanvas.classList.add('text-overlay');
    liveView.appendChild(toWriteCanvas);
    let ctx = toWriteCanvas.getContext('2d');
    ctx.clearRect(0,0,toWriteCanvas.width, toWriteCanvas.height);
    ctx.font = '35px Arial';
    ctx.fillStyle='rgb(220,170,15)';
    ctx.textAlign = 'center';
    let blur = 5;
    width = ctx.measureText(instruction).width + blur*10;
    ctx.shadowColor = '#000';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = blur;
    ctx.fillText(instruction, toWriteCanvas.width/2, toWriteCanvas.height*0.7);
}


function drawToCanvas(){
    let ctx = canvas.getContext('2d');
    // ctx.drawImage(video, 0,0,video.width,video.height);
    const videoData = ctx.getImageData(0,0,video.width, video.height);
    const data = videoData.data;
    let n=0;
    if(pose){
        for(let i=0; i<data.length; i+=4){
            if(partSegmentation.data[n] !== -1){
                data[i] = colorMap[partSegmentation.data[n]].r;
                data[i+1] = colorMap[partSegmentation.data[n]].g;
                data[i+2] = colorMap[partSegmentation.data[n]].b;
                data[i+3] = colorMap[partSegmentation.data[n]].a;
            }
            else{
                data[i+3] = 0;
            }
            n++;
        }

        
        ctx.putImageData(videoData, 0, 0);
        // for(let i=3; i<pose.keypoints.length; i++){
        //     let x = pose.keypoints[i].position.x;
        //     let y = pose.keypoints[i].position.y;
            
        //     let confidence = pose.keypoints[i].score;
            
        //     let xDistance = Math.abs(pose.keypoints[1].position.x - pose.keypoints[2].position.x);
        //     let distance = Math.floor((xDistance)/(.15*xDistance));
        //     if(confidence > .5){
        //         ctx.beginPath();
        //         ctx.arc(x, y, distance, 0, 2*Math.PI, true)
        //         ctx.fillStyle = 'rgb(120,220,170)';
        //         ctx.fill();
        //     }
        // }
    }
}