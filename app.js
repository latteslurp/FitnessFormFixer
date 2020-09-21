const   express         = require('express'),
        app             = express();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static(__dirname+'/public'));

app.get('/', (req, res)=>{
    res.render('landing');
});

app.get('/webcam', (req, res)=>{
    res.render('main');
});

app.listen(HTTP_PORT, ()=>{ 
    console.log('Server is listening!');
});


// import * as posenet from './node_modules/@tensorflow-models/posenet';

// const webcamElement = document.getElementById('webcam');
// const canvasElement = document.getElementById('canvas');
// const webcam = new Webcam(webcamElement, 'user', canvasElement);

// webcam.start()
//     .then(result=>{
//         console.log('webcam is on!');
//         webcam.flip();
//     })
//     .catch(err=>{
//         console.log(err);
// });

// let poseNet;

// async function estimatePoseOnImage(imageElement) {
//     const net = await posenet.load();
  
//     const pose = await net.estimateSinglePose(imageElement, {
//       flipHorizontal: true
//     });
//     return pose;
// }
// const tf = require('@tensorflow/tfjs');

// // Train a simple model:
// const model = tf.sequential();
// model.add(tf.layers.dense({units: 100, activation: 'relu', inputShape: [10]}));
// model.add(tf.layers.dense({units: 1, activation: 'linear'}));
// model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});

// const xs = tf.randomNormal([100, 10]);
// const ys = tf.randomNormal([100, 1]);

// model.fit(xs, ys, {
//   epochs: 100,
//   callbacks: {
//     onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log.loss}`)
//   }
// });