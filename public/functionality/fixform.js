const body = document.getElementsByTagName("BODY")[0];
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const buttonsDiv = document.getElementById('exercises-div');
const instructionBox = document.getElementById('instruction-box');
const formCoach = document.getElementById('form-coach');
const instructionMessage = document.getElementById('extensive-instruction');
const finishWorkoutButton = document.getElementById('finish-workout');
const performanceOverlay = document.getElementById('performance-overlay');

window.onload = () =>{
    init();
}

let videoRenderCanvas = document.createElement('canvas');
let videoRenderCanvasCtx = videoRenderCanvas.getContext('2d');

function init(){
    const enableWebcam = document.getElementById('enable-webcam');

    enableWebcam.addEventListener('click', async()=>{
        if (gotUserMedia) {
            canvas.style.display = 'block';
            video.style.display = 'block';
            enableWebcam.style.display = 'none';
            finishWorkoutButton.classList.add('disable');

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRenderCanvas.width = video.width;
            videoRenderCanvas.height = video.height;
            video.srcObject = stream; 
            video.addEventListener('play', loadModel);
        }
    });
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
    // nn.loadData('models/curl/model.json', trainData);
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


let currentPickedExercise;
let exercisesDiv = document.getElementById('exercises-div');
let hasExercised = false;
function handleClick(){
    exercisesDiv.addEventListener('click', ()=>{
        if (!event.target.classList.contains('exercise-options')) return;
        event.target.classList.add('active');
        let buttons = document.querySelectorAll('.exercise-options');
        Array.from(buttons).forEach(button=>{
            if(button === event.target){
                // console.log(button.dataset.exercise, 'clicked');
                
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
                    finishWorkoutButton.disabled = true;
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
                    finishWorkoutButton.disabled = true;
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
            visualizeAfterWorkoutFinished();
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
        if(state === 'collecting'){
            console.log('collecting!!!');
            let bodyPart=[];
            for(let i=0; i<pose.keypoints.length-4; i++){
                let x = pose.keypoints[i].position.x;
                let y = pose.keypoints[i].position.y;
                let partLabel = pose.keypoints[i].part;
                bodyPart.push(x);
                bodyPart.push(y);
            }
            let labelOutput = ['curl,peak-elbow'];
            nn.addData(bodyPart, labelOutput);
        }
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
        epochs:300
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

let defaultInstruction = 'Hey there, buddy!';
let instruction = defaultInstruction;
let extensiveInstruction;
let defaultExtensiveInstruction = 'Hello! Make sure to face the webcam as you do the workout. I\'m watching!';
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
            curlFormFixer(estimatedForm, confidence);
            window.requestAnimationFrame(writeToCanvas);
        }
        else if(currentPickedExercise === 'pushup'){
            pushupFormFixer(estimatedForm, confidence);
            window.requestAnimationFrame(writeToCanvas);
        }
        else if(currentPickedExercise === 'squat'){
            squatFormFixer(estimatedForm, confidence);
            window.requestAnimationFrame(writeToCanvas);
        }
        // console.log('estimatedForm = ',estimatedForm);
    }
}

let timeUnderTension = []
let overallPerformance = []

function closePerformance(){
    const closeGraphButton = document.getElementById('close-performance-overlay');
    closeGraphButton.addEventListener('click', ()=>{
        hasExercised = false;
        if(!hasExercised){
            performanceOverlay.style.width = '0%';
            performanceOverlay.style.display = 'none';
            finishWorkoutButton.classList.add('disable');
            finishWorkoutButton.disabled = true;
            body.style.overflow = 'auto';
            timeUnderTension = [];
            overallPerformance = [];
        }
    });
    
}

function visualizeAfterWorkoutFinished(){
    finishWorkoutButton.addEventListener("click", ()=>{
        // visualize graphs
        d3.select('#tut-graph').selectAll('*').remove();
        d3.select('#overall-graph').selectAll('svg').remove();
        performanceOverlay.style.display = 'block';
        performanceOverlay.style.width = '100%';
        body.style.overflow = 'hidden';
        // console.log(timeUnderTension);
        // console.log(overallPerformance);
        const padding = 30;
        const marginTUT = {top: 30, bottom: 30, left: 30, right: 30},
            widthTUT = 500 - marginTUT.left - marginTUT.right + 1.5*padding,
            heightTUT = 350 - marginTUT.top - marginTUT.bottom + 1.5*padding;
            
        const rTUTScale = 5;

        const svgTUT = d3.select('#tut-graph')
                        .append("svg")
                            .attr('width', widthTUT + marginTUT.left + marginTUT.right + padding )
                            .attr('height', heightTUT + marginTUT.top + marginTUT.bottom + 1.5*padding)
                        .append('g')
                            .attr("transform", 'translate(' + marginTUT.left + ',' + (marginTUT.top+2*rTUTScale) + ')');

        // const clipTUT = svgTUT.append('clipPath')
        //                     .attr('id', 'clipTUT');
        // const clipRectTUT = clipTUT.append('rect')
        //                         .attr('width', widthTUT + marginTUT.left + marginTUT.right + padding)
        //                         .attr('height', heightTUT + marginTUT.top + marginTUT.bottom + 1.5*padding);

        const tooltipTUT = d3.select('body')
                                .append('div')
                                    .classed('tooltip', true);

        const xTUTScale = d3.scaleLinear()
                                .domain(d3.extent(timeUnderTension, d=>d.repCount))
                                .range([0, widthTUT]);
        
        const yTUTScale = d3.scaleLinear()
                                .domain(d3.extent(timeUnderTension, d=>d.duration))
                                .range([heightTUT, 0]);

        const lineTUT = d3.line()
                            .defined(d=>!isNaN(d.duration))
                            .x(d=>{
                                return xTUTScale(d.repCount);
                            })
                            .y(d=>{
                                return yTUTScale(d.duration);
                            })
                            .curve(d3.curveMonotoneX);

        const areaTUT = d3.area()
                                .x(d=>{return xTUTScale(d.repCount)})
                                .y0(heightTUT)
                                .y1(d=>{return yTUTScale(d.duration)})
                                .curve(d3.curveMonotoneX);

        const xTUTAxis = d3.axisBottom(xTUTScale)
                            .tickFormat(d => {
                                if(d%1 === 0){
                                    return d;
                                }
                            })
                            .tickSizeOuter(0);
        const yTUTAxis = d3.axisLeft(yTUTScale)
                            .tickSizeOuter(0);

        const pathTUT = svgTUT.append("path")
                    .datum(timeUnderTension)
                    .attr('fill', 'none')
                    .attr("stroke", "#0052ff")
                    .attr("stroke-width", 2)
                    .attr('clip-path', 'url(#clipTUT)')
                    .attr("d", lineTUT);
                    
        
        const pathAreaTUT = svgTUT.append('path')
                                    .datum(timeUnderTension)
                                    .attr('fill', '#0099ff')
                                    .attr('stroke', 'none')
                                    // .attr('clip-path', 'url(#clipTUT)')
                                    .attr('d', areaTUT);

        let totalLengthTUT = pathTUT.node().getTotalLength();
        
        //animation of path
        pathTUT
                .attr("transform", "translate("+ 1.5*padding +", "+ (-.5*padding) + ")")
                .attr("stroke-dasharray", totalLengthTUT + " " + totalLengthTUT)
                .attr("stroke-dashoffset", totalLengthTUT)
                .transition()
                    .duration(1800)
                    .ease(d3.easeLinear)
                    .attr("stroke-dashoffset", 1);
        
        pathAreaTUT
                    .attr("transform", "translate("+ 1.5*padding +", "+ (-.5*padding) + ")")
                    .classed('areaTUT', true)
                    .attr('opacity', 0.3);
        
        // clipRectTUT.transition()
        //             .duration(1500)
        //             .ease(d3.easeLinear)
        //             .attr('width', widthTUT + marginTUT.left + marginTUT.right + padding);

        svgTUT.append('g')
                .attr("transform", "translate("+ 1.5*padding +", "+ (heightTUT-.5*padding) + ")")
                .call(xTUTAxis);
        svgTUT.append('g')
                .attr("transform", "translate("+1.5*padding+","+(-.5*padding)+")")
                .call(yTUTAxis);

        svgTUT.selectAll('repTUTDots')
                .data(timeUnderTension)
                .enter()
                .append('circle')
                    .attr('transform', 'translate('+1.5*padding+','+(-.5*padding)+')')
                    .attr('fill', '#ff8800')
                    .attr('stroke', '#aa1188')
                    .attr('stroke-width', 1)
                    .attr('cx', d => {return xTUTScale(d.repCount)})
                    .attr('cy', d=> {return yTUTScale(d.duration)})
                    .attr('r', rTUTScale)
                    .on('mousemove', d=>{
                        tooltipTUT
                            .style('opacity', 1)
                            .style('left', d3.event.x + 'px')
                            .style('top', d3.event.y-1.5*padding + 'px')
                            .html(`
                                <p>TUT: ${d.duration} ms</p>
                                <p>Rep Count: ${d.repCount}</p>
                            `);
                    })
                    .on('mouseout', ()=>{
                        tooltipTUT
                            .style('opacity', 0);
                    });

        // svgTUT.selectAll('repTUTDots')
        //         .transition()
        //         .delay((d,i)=>{return i*2})
        //         .duration(1000)

        //x-axis text
        svgTUT.append('text')
                .attr('x', (widthTUT+padding)/2)
                .attr('y', heightTUT-padding/4)
                .attr('dy', '1.5em')
                .style('text-anchor', 'middle')
                .style('font-family', 'Arial')
                .text('Rep Count');

        //y-axis text
        svgTUT.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', (-heightTUT)/2)
                .attr('y', padding)
                .attr('dy','-1.5em')
                .style('text-anchor', 'middle')
                .style('font-family', 'Arial')
                .text('Eccentric duration (ms)');

        //title text
        svgTUT.append('text')
                .attr('x', (widthTUT+1.5*padding)/2)
                .attr('y', -2/3*padding)
                .style('text-anchor', 'middle')
                .style('font-family', 'Arial')
                .style('font-size', '1.3em')
                .style('font-weight', 600)
                .text('Time Under Tension');

        const marginOverall = marginTUT,
                widthOverall = 500 - marginOverall.left - marginOverall.right + padding,
                heightOverall = 350 - marginOverall.top - marginOverall.bottom + padding;

        const radiusOverall = widthOverall/3 - marginOverall.top;
        
        let performanceAverage = [0,0,0,0];
        let hasSeen = [0,0,0,0];
        for(let i=0; i<overallPerformance.length; i++){
            if(overallPerformance[i].scoreDesc === 'above9'){
                hasSeen[0]++;
                performanceAverage[0] += overallPerformance[i].score;
            }
            else if(overallPerformance[i].scoreDesc === 'above8'){
                hasSeen[1]++;
                performanceAverage[1] += overallPerformance[i].score;
            }
            else if(overallPerformance[i].scoreDesc === 'below2'){
                hasSeen[2]++;
                performanceAverage[2] += overallPerformance[i].score;
            }
            else if(overallPerformance[i].scoreDesc === 'below1'){
                hasSeen[3]++;
                performanceAverage[3] += overallPerformance[i].score;
            }
        }

        // console.log('performance average:', performanceAverage);
        let positive = 0;
        let negative = 0;
        let posCount = 0;
        let negCount = 0;
        let sumPerformanceAvg = 0;
        for(let i=0; i<performanceAverage.length; i++){
            let current = performanceAverage[i]/hasSeen[i];
            // console.log(current);
            if(!isNaN(current)){
                if(i<2){
                    positive += current;
                    posCount++;
                }
                else{
                    negative -= current;
                    negCount++;
                }
            }
            else continue;
        }
        sumPerformanceAvg = (positive/posCount) + (negative/negCount);
        // console.log('performanceAvg: ',performanceAverage);
        // console.log('hasSeen:', hasSeen);
        // console.log('sumPerformanceAvg: ', sumPerformanceAvg);
        let average = Math.floor(sumPerformanceAvg*100)/10;
        // console.log('avarage: ', average);

        const metric = ['above9', 'above8', 'below2', 'below1'];
        const comment = ['Awesome form!', 'Good form :)', 'Poor form :(', 'Terrible form :((']

        let performanceData = []
        for(let i=0; i<performanceAverage.length; i++){
            performanceData.push({
                score:performanceAverage[i],
                desc: metric[i],
                comment: comment
            });
        }
        
        const colorScaleOverall = d3.scaleOrdinal()
                                        .domain(metric)
                                        .range(['#00DC59','#67C53A', '#EA4E00', '#D50F0F']);
                                        
        const svgOverall = d3.select('#overall-graph')
                                .append('svg')
                                    .attr('width', widthOverall + marginOverall.left + marginOverall.right)
                                    .attr('height', heightOverall + marginOverall.top + marginOverall.bottom)
                                .append('g')
                                    .attr('transform', 'translate('+widthOverall/2+','+heightOverall/2+')');

        const arcs = d3.pie()
                        .value(d=>{return d.score})
                        (performanceData);

        const pathOverall = d3.arc()
                        .outerRadius(radiusOverall)
                        .innerRadius(radiusOverall/2.5)
                        // .startAngle(0)
                        // .endAngle(2*Math.PI);

        const tooltipPerformance = d3.select('body')
                                        .append('div')
                                            .classed('tooltip2', true);

        const arcOverall = svgOverall.selectAll('.slice')
                                        .data(arcs)
                                        .enter()
                                        .append('path')
                                            .classed('slice', true)
                                            .attr('fill', d=>{
                                            return colorScaleOverall(d.data.desc)
                                        })
                                        .attr('d', pathOverall)
                                        .on('mouseover', (d,i)=>{
                                            tooltipPerformance
                                                .style('opacity', 1)
                                                .style('left', d3.event.x - widthOverall/4 + 'px')
                                                .style('top', d3.event.y-1.5*padding + 'px')
                                                .html(`
                                                    <p>${d.data.comment[i]}
                                                    </p>
                                                    <p>Form score: ${Math.floor(1000*d.data.score/ hasSeen[i])/100 >= 8 ? Math.floor(1000*d.data.score/ hasSeen[i])/100 : -Math.floor(1000*d.data.score/ hasSeen[i])/100}</p>
                                                `);
                                        })
                                        .on('mouseout', ()=>{
                                            tooltipPerformance
                                                .style('opacity', 0);
                                        })
                                        .transition()
                                            // .delay((d,i)=>{
                                            //     return i*500
                                            // })
                                            .duration(1800)
                                            .attrTween('d', d=>{
                                                let i = d3.interpolate(d.endAngle, d.startAngle);
                                                return (t)=>{
                                                    d.startAngle = i(t)
                                                    return pathOverall(d);
                                                }
                                            });

        //title text
        svgOverall.append('text')
                    .attr('x', 0)
                    .attr('y', -(heightOverall - 1.5*padding - 5)/2)
                    .style('text-anchor', 'middle')
                    .style('font-family', 'Arial')
                    .style('font-size', '2em')
                    .style('font-weight', '600')
                    .text('Overall Performance')

        //score text
        const scoreText = svgOverall.append('text')
                    .attr('x', 0)
                    .attr('y', 2)
                    .attr('opacity', 0)
                    .style('text-anchor', 'middle')
                    .style('font-family', 'Arial')
                    .style('font-weight', 600)
                    .style('font-size', '1.7em')
                    .text(average)
                    .classed('average-performance-score', true)
                    
        scoreText.attr('opacity', 1);
                    
        // reset ongoing workout to no workout
        instruction = defaultInstruction;
        writeToCanvas();
        extensiveInstruction = defaultExtensiveInstruction;
        instructionMessage.innerText = extensiveInstruction;
        formCoach.classList.remove('correctForm');
        formCoach.classList.remove('wrongForm');
        let buttons = document.getElementsByClassName('exercise-options');
        Array.from(buttons).forEach(button=>{
            button.classList.remove('active');
        });
        currentPickedExercise = null;
        for(let i=0; i<colorMap.length; i++){
            colorMap[i].a = 0;
        }
        closePerformance();
    });
}


//boolean to check if exercise is on the eccentric portion
let isEccentric = false;
//timer for TUT graph
let startTUT;
let endTUT;

function pushupFormFixer(estimatedForm, confidence){
    // hasExercised = true;
    instruction = 'Feature coming soon!'
    extensiveInstruction = 'This feature is not available yet.';
    instructionMessage.innerText = extensiveInstruction;
    formCoach.classList.remove('wrongForm');
    formCoach.classList.remove('correctForm');
}
function squatFormFixer(estimatedForm, confidence){
    // hasExercised = true;
    instruction='Feature coming soon!'
    extensiveInstruction = 'This feature is not available yet.';
    instructionMessage.innerText = extensiveInstruction;
    formCoach.classList.remove('wrongForm');
    formCoach.classList.remove('correctForm');
}

function curlFormFixer(estimatedForm, confidence){
    hasExercised = true;
    let score;
    let scoreDesc;
    // console.log(estimatedForm);
    let pointOfExercise = estimatedForm.split('-')[0];
    console.log(pointOfExercise);
    console.log(estimatedForm);
    let form = estimatedForm.split('-')[1];
    if(pointOfExercise ==='initial'){
        if(isEccentric){
            isEccentric = !isEccentric;
            endTUT = new Date().getTime();
            if(startTUT){
                let duration = endTUT - startTUT;
                timeUnderTension.push(
                    {
                        duration: duration, 
                        repCount: (timeUnderTension.length) + 1
                });
                if(timeUnderTension.length > 3){
                    setTimeout(()=>{
                        finishWorkoutButton.classList.remove('disable');
                        finishWorkoutButton.disabled = false;
                    }, 1500);
                }
            }
        }
        if(form==='slouch'){
            score = 1-confidence;
            instruction = 'Keep your back straight at all times!'; 
            extensiveInstruction = 'Don\'t slouch! That may affect your posture, specifically your anterior delt to be rolled forward. Make sure to keep your back and shoulders straight at all times.';
            // console.log('Keep your back straight at all times!');
        }
        else if(form==='correct'){
            score = confidence;
            instruction = 'Nice form!';
            extensiveInstruction = 'Awesome! Maintain that form!';
            // console.log('Nice form. Maintain that.');
        }
        else if(form==='arch'){
            score = 1-confidence;
            instruction = 'Don\'t arch to much, stand up right.'; 
            // console.log('Don\'t arch to much, stand up right.');
            extensiveInstruction = 'Keep your back straight and neutral before curling.'
        }
        scoreDesc = score >= 0.8 && score < 0.9?  'above8' : score > 0.9 ? 'above9' :
                    score <= 0.2 && score >0.1 ? 'below2' : 'below1';
        overallPerformance.push({score: score, scoreDesc: scoreDesc});

    }
    else if(pointOfExercise==='peak'){
        isEccentric = true;
        startTUT = new Date().getTime();
        if(form==='slouch'){
            score = 1-confidence;
            // console.log('Keep your back straight at all times!');
            instruction='Keep your back straight at all times!';
            extensiveInstruction = 'Don\'t slouch! That may affect your posture, specifically your anterior delt to be rolled forward. Make sure to keep your back and shoulders straight at all times.';
        }
        else if(form==='correct'){
            score = confidence;
            instruction='Great form!';
            extensiveInstruction = 'Great! Maintain that form!';
            // console.log('Nice form. Maintain that.');
        }
        else if(form==='arch'){
            score = 1-confidence;
            instruction = 'Don\'t arch to much, stand up right.';
            // console.log('Don\'t arch to much, stand up right.');
            extensiveInstruction = 'Arching on peak contraction could potentially injure your lower back. Make sure to control the rep and keep your back straight.'
        }
        else if(form==='shrug'){
        console.log(form);
            score = 1-confidence;
            instruction = 'Don\'t shrug.'
            console.log(score)
            // console.log('Make sure to keep your elbow stay and put it out of the equation from the exercise');
            extensiveInstruction = 'Try to suppress your shoulder the entire time. Lower the weight if it is too heavy!';
        }
        else{//elbow moved
            console.log(form);
            score = 1-confidence;
            console.log(score)
            instruction = 'Don\'t move your elbow.'
            // console.log('Make sure to keep your elbow stay and put it out of the equation from the exercise');
            extensiveInstruction = 'Make sure to keep your elbow stay through the entire rep.';
        }
        scoreDesc = score >= 0.8 && score < 0.9?  'above8' : score > 0.9 ? 'above9' :
                    score <= 0.2 && score >0.1 ? 'below2' : 'below1';
        overallPerformance.push({score: score, scoreDesc: scoreDesc});
    }
    instructionMessage.innerText = extensiveInstruction;
    if(form === 'correct'){
        formCoach.classList.remove('wrongForm');
        formCoach.classList.add('correctForm');
    }
    else{
        formCoach.classList.remove('correctForm');
        formCoach.classList.add('wrongForm');
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
    ctx.font = '40px Arial';
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