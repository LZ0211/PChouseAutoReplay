var request = require("./request");
var parser = require("./parser");
var utils = require("./utils");
var score = require("./score");
var Random = require("./JSrandom");
var fs = require("fs");
var DB = require("./dataBase");
var randomTitle = require("./randomTitle");
var Sites = require("./Sites");
var Style = require("./styles");

process.chdir(__dirname)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var randomAuthors = new DB("randomAuthors.json");


function noop(){}

function print(data,next){
    if (!next){
        next = data;
        next();
    }else {
        console.log(data);
        next(data);
    }
}


function getQuestionsInfos(data,next){
    var $ = parser.load(data).$;
    var infos = $("tr[target=workStatId]").map(function (i,v){
        var nodes = $(v).find("td");
        return {
            "Id" : nodes.eq(0).text(),
            "questionId" : nodes.eq(1).text(),
            "questionTitle" : nodes.eq(2).text(),
            "questionStatus" : nodes.eq(3).text(),
            "pubStatus" : nodes.eq(4).text(),
            "pubURL" : nodes.eq(5).text(),
            "updateBy" : nodes.eq(6).text(),
            "updateDate" : nodes.eq(7).text()
        }
    }).toArray();
    next(infos);
}

function generateForm(pageNum,processStatus,status,id){
    return {
        //每页问题数目
        numPerPage: 25,
        //第几页
        pageNum: pageNum || Random.randInt(20),
        //排序方式 
        orderField : "update_date",
        q_eq_websiteId : "",
        q_eq_parentId : "",
        //排序降序
        orderDirection : "desc",
        q_eq_categoryId : "",
        q_eq_questionId : id || "",
        q_cn_title : "",
        //处理状态 (-99,全部),(1,已解决),(2,待解决),(3,作废)
        processStatus : processStatus || -99,
        q_ge_createDate : "",
        q_le_createDate : "",
        q_ge_askDate : "",
        q_le_askDate : "",
        q_ge_pushAnswerCount : "",
        //问题状态 (-99,全部),(0,草稿),(1,待审核),(2,已审核),(3,已编),(4,无匹配答案),(-1,关闭)
        status : status || 0,
        q_cn_updateBy : "",
        q_ge_updateDate : "",
        q_le_updateDate : "",
    };
}

function isComplete($,url){
    var rules = {
        "list.do":".pagination",
        "update.do":"script"
    };
    for (var x in rules){
        var reg = new RegExp(x);
        if (reg.test(url)){
            var selector = rules[x];
            return $(selector).length;
        }
    }
}

function login(next){
    utils.command([Style("请输入登陆账号：","bold"),Style("请输入登陆密码：","bold")],function (username,password){
        username = username || "yuquan";
        password = password || "yuquan_1111";
        console.log(Style("正在登录...","bold","yellow"));
        utils.autoRetry({
            promise:function (){
                return request.post("https://219.136.245.112/security-server/auth.do",{
                    "username":username,
                    "password":password,
                    "return":"http://caiji.pchouse.com.cn/admin/login.jsp"
                });
            },
            resolve:function (){
                console.log(Style("登录成功！","bold","green"));
                next();
            },
            times:Infinity
        });
    });
}

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
        times:5,
        timeout:1000,
    });
}

function getQuestions(form,next){
    var url = "http://caiji.pchouse.com.cn/admin/question/list.do";
    console.log("正在采集问题列表...");
    utils.autoRetry({
        promise:function (){
            return request.post(url,form).charset("UTF-8");
        },
        resolve:function (data){
            var $ = parser.load(data).$;
            if (!isComplete($,url)){
                return getQuestions(form,next);
            }
            else {
                console.log("问题列表采集完成！");
                next(data);
            }
        },
        times:Infinity
    });
}

function parseQuestionsURLs(data,next){
    var $ = parser.load(data).$;
    var array = $(".pageContent > table > tbody")
        .find("a[rel=update-question]")
        .map((i,v)=>({href:$(v).attr("href"),text:$(v).text()}))
        .toArray()
        .filter(x=>x.text);
    return next(array);
}

function getQuestion(item,next){
    var url = item.href;
    console.log("正在获取问题内容...");
    utils.autoRetry({
        promise:()=>request.get(url),
        resolve:function (data){
            var $ = parser.load(data).$;
            if (!isComplete($,url)){
                return getQuestion(item,next);
            }else {
                console.log("问题内容已获取！");
                item.$ = $;
                next(item);
            }
        },
        times:Infinity
    });
}

function getQuestionDetails(item,next){
    var $ = item.$;

    function getQuestionTitle(){
        return $("textarea[name=title]").val();
    }

    function getSource(){
        return $("input[name=url]").val();
    }

    function getQuestionDescription(){
        return $("textarea[name=description]").val();
    }

    function getAnswerList(){
        return $("#answerTab").find("tr.unitBox").map(function (index,value){
            return $(value).find("td").eq(1).text();
        }).toArray();
    }

    function getAnswerSelected(){
        return $("#ans-table").find("textarea.textInput").map(function (index,value){
            return $(value).val();
        }).toArray();
    }

    function getAnswerRecommend(){
        return $("#ans-table").find("input:checked").parents("tr.unitBox").find("textarea.textInput").val();
    }

    function getCatagoryURL(){
        var re = /\$\("#selectTypeQuestion"\).load\("(.*)"\)/;
        var script = $("script").html();
        return re.exec(script)[1];
    }

    next({
        url:item.href,
        source:getSource(),
        catagory:getCatagoryURL(),
        $:$,
        title:getQuestionTitle(),
        description:getQuestionDescription(),
        options:getAnswerList().slice(0,15),
        selected:getAnswerSelected(),
        recommend:getAnswerRecommend()
    });
}

function getQuestionForm(item,next){
    var $ = item.$;
    var form = {};
    $(":input").each(function (i,v){
        var name = $(v).attr("name");
        var value = $(v).val();
        if (name){
            form[name] = value;
        }
    });
    next(form);
}

function getAnswersFromSource(item,next){
    console.log("正在采集问题答案...");
    getSourceHTML(item.source,function (dict){
        console.log("答案采集完成！");
        item.selected =dict.answers;
        next(item);
    });
}

function processQuestion(data,next){
    console.log("正在筛选问题答案...");
    next(score.recommand(data));
    console.log("答案筛选完成！");
}

function getCatagory(item,next){
    utils.autoRetry({
        promise:function (){
            return request.get(item.catagory)
        },
        resolve:function (data){
            var $ = parser.load(data).$;
            if (!$("script").length){
                return getCatagory(item,next);
            }else {
                var _$ = item.$;
                data = data.replace('value="-99" selected','value="-99"');
                _$("#selectTypeQuestion").html(data);
                next(item);
            }
        },
        times:Infinity
    });
}


function createForm(item){
    console.log("生成表单...");
    var $ = item.$;
    var form = {};
    $(":input").each(function (i,v){
        var name = $(v).attr("name");
        var value = $(v).val();
        if (name){
            form[name] = value;
        }
    });
    // form.oldTitle = Randomtitle("");
    console.log("修改问题标题...");
    form.title = randomTitle(item.title);
    if (form.title == form.oldTitle){
        form.oldTitle = form.oldTitle.substr(0,10);
    }
    var selected = item.selected.slice(0,Random.randInt(3,6));
    var authors = Random.sample(randomAuthors.keys(),selected.length).map(x=>randomAuthors.get(x));
    form.bestAnsIndex = Random.randInt(0,2);
    selected.forEach(function (value,index){
        var author = authors[index];
        form[`answer[${index}].isDelete`] = "";
        form[`answer[${index}].id`] = "";
        form[`answer[${index}].content`] = value.text;
        form[`answer[${index}].kwAccountId`] = author.accountId;
        form[`answer[${index}].kwAccountName`] = author.accountName;
    });
    return form;
}

function sumbitQuestion(item,next){
    var data = createForm(item);
    delete item.$;
    console.log(data);
    if (item.selected.length < 3){
        console.log(Style("没有足够合适的答案...","red","bold"));
        return next();
    }
    console.log(Style("正在提交答案...","yellow","bold"));
    //next();
    request.post(item.url).send(data).charset("UTF-8").timeout(1000 * 90).end(function (){
        console.log(Style("答案提交成功！","green","bold"));
        next();
    });
}

function getRandomAuthor(next){
    var random = +new Date();
    var url = "http://caiji.pchouse.com.cn/admin/action/getRandomAccount.jsp?_=";
    request.ajax({
        url:url+random,
        dataType:"json",
        success:next,
        error:(e)=>{console.log(e);getRandomAuthor(next)}
    });
}

function batchGetRandomAuthor(){
    var array = Array(100).fill(1).map((v,i)=>i+1);
    utils.parallel(array,function (v,next){
        //console.log(v)
        getRandomAuthor(function (data){
            randomAuthors.insert(data.accountId,data);
            next();
        });
    });
}

var BatchprocessQuestions = (function(){
    var startTime = new Date();
    var workTime = 0;
    var pageNum = Random.randInt(5,50);
    function randomQuestion(array,fn){
        console.log("随机抽取一个问题！");
        fn(Random.choice(array));
    }
    function Timeout(fn,time){
        if (time <=0){
            fn();
        }else {
            console.log(Style("暂停"+time/1000+"秒...","green"))
            setTimeout(fn,time);
        }
    }
    function waitSec(time){
        time = time || 10;
        time = parseInt(Random.gaussian(time,time/2));
        time *= 1000;
        return function (data,next){
            if (!next){
                next = data;
                Timeout(next,time);
            }else {
                Timeout(function (){
                    return next(data);
                },time);
            }
        }
    }
    return function(){
        var now = new Date();
        var callee = arguments.callee;
        if (now - startTime >= workTime){
            if (workTime > 0){
                console.log("挂机结束...");
            }
            return utils.command([Style("请输入挂机时间(h)：","bold",'yellowBG'),Style("请输入问题页数：","bold",'yellowBG')],function (time,num){
                time = Number(time);
                num = parseInt(num);
                if (isNaN(time) || time <= 0){
                    return process.exit(0);
                }
                startTime = new Date();
                workTime = time * 3600 * 1000;
                if (!isNaN(num) && num > 0){
                    pageNum = num;
                }
                console.log(Style("开始挂机...",'green','bold'));
                callee();
            });
        }
        utils.async.thread().series([
            next=>next(generateForm(pageNum)),
            getQuestions,
            parseQuestionsURLs,
            randomQuestion,
            //waitSec(3),
            getQuestion,
            getQuestionDetails,
            getCatagory,
            getAnswersFromSource,
            processQuestion,
            //waitSec(8),
            sumbitQuestion,
            callee,
            //next=>BatchprocessQuestions()
            //(data,next)=>getQuestion(data[0],next),
            //(data,next)=>console.log(data)
        ]);
    }
})();



/*function changeTitle(form,next){
    form.title = Randomtitle(form.title);
    next(form);
}*/


login(BatchprocessQuestions)

//采集问题
/*var questions = new DB("questions.json")
login(function (){
    var array = [];
    utils.parallel(Array(100).fill(1).map((a,b)=>a+b),function (num,callback){
        console.log(num)
        utils.async.thread().series([
            next=>next(generateForm(num,1,-99)),
            getQuestions,
            parseQuestionsURLs,
            (urls,next)=>{array = array.concat(urls);next()},
            callback
        ]);
    },function (){
        var index = 0;
        array = array.filter(object=>{
            var url = object.href;
            var id = url.replace(/.*questionId=/,"");
            return !questions.get(id);
        });
        utils.parallel(array,function (url,callback){
            index += 1;
            console.log(index);
            utils.async.thread().series([
                (next)=>getQuestion(url,next),
                getQuestionDetails,
                getCatagory,
                (item,next)=>{
                    var $ = item.$;
                    next({
                        url:item.url,
                        title:item.title,
                        description:item.description,
                        firstType:$("#firstTypeselectTypeQuestion").find("option:selected").text(),
                        secondType:$("#secondTypeselectTypeQuestion").find("option:selected").text(),
                        selected:item.selected,
                    });
                },
                (item,next)=>{
                    var id = item.url.replace(/.*questionId=/,"");
                    questions.insert(id,item);
                    next();
                },
                callback
            ]);
        },function (){
            process.exit();
        });
    });
});
*/