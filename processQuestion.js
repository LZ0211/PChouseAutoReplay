var score = require("./score");

process.on("message",function (msg){
    process.send(score.recommand(msg));
    process.nextTick(function (){
        process.exit();
    });
});