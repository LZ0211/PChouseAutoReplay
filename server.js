var WS = require('./websocket');
var request = require("./request");
var parser = require("./parser");
var utils = require("./utils");
var score = require("./score");
var Random = require("./JSrandom");
var DB = require("./dataBase");
var randomTitle = require("./randomTitle");
var Sites = require("./Sites");

var randomAuthors = new DB("randomAuthors.json");


function getSourceHTML(url,next){
    var rule = Sites.search(url);
    //console.log(rule);
    utils.autoRetry({
        promise:()=>request.get(url),
        resolve:function (data){
            data = parser.decode(data,rule.charset);
            var $ = parser.load(data).$;
            if (!rule.footer($)){
                return getSourceHTML(url,next);
            }
            else {
                next({
                    title:rule.title($),
                    description:rule.description($),
                    answers:rule.answers($)
                        .sort((a,b)=>b.accept - a.accept || b.text.length - a.text.length)
                        .filter(v=>v.text.length > 35)
                });
            }
        },
        reject:function (){
            next({
                title:"",
                description:"",
                answers:[]
            });
        },
        times:Infinity,
    });
}

function getAnswersFromSource(item,next){
    getSourceHTML(item.source,function (dict){
        item.selected =dict.answers;
        next(item);
    });
}


var server = WS.createServer(function (conn) {
    console.log("连接到服务器...")
    conn.on("text", function (str) {
        var data = JSON.parse(str);
        console.log("开始采集答案...")
        getAnswersFromSource(data,function (data){
            console.log("答案采集成功...");
            var item = score.recommand(data);
            var selected = item.selected;
            item.title = randomTitle(item.title);
            item.authors = Random.sample(randomAuthors.keys(),selected.length).map(x=>randomAuthors.get(x));
            console.log("提交答案...")
            conn.sendText(JSON.stringify(item));
            conn.close();
        });
    });
    conn.on("close", function (code, reason) {
        console.log("断开连接...");
    });
}).listen(3000);

