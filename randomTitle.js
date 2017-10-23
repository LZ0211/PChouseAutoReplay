var Random = require("./JSrandom");
var select = function (object){
    var array = [];
    for (var k in object){
        var number = Number(object[k]);
        if (isNaN(number)){
            number = 1;
        }
        Array(number).fill(1).forEach(x=>array.push(k));
    }
    return Random.choice(array);
}

function fix(Dicts,subDicts){
    var fix = "",
        word = select(Dicts);
    
    while (word in Dicts){
        fix += word;
        word = select(Dicts[word]);
    }
    while (word in subDicts){
        fix += word;
        word = select(subDicts[word]);
    }
    fix += word;
    return fix;
}

function randomPrefix(){
    var Dicts = {
        "我":{
            "想":1,
            "问":1,
            "咨询":1,
            "请教":1,
            "求助":1
        },
        "小白":{
            "想":1,
            "咨询":1,
            "请教":1,
            "求助":1
        },
        "想":{
            "问":1,
            "咨询":1,
            "知道":1,
            "请问":1,
            "了解":1,
            "请教":1,
            "求助":1
        },
        "问":{
            "一下":2,
            "一问":1
        },
        "问问":{
            "各位":1,
            "大家":1
        },
        "咨询":{
            "一下":4,
            "下":1,
            "各位":1
        },
        "请问":{
            "一下":4,
            "下":1,
            "各位":2
        },
        "了解":{
            "一下，":3,
            "下，":1
        },
        "请教":{
            "一下":1,
            "下":1,
            "各位":1
        },
        "求助":{
            "一下":1,
            "下":1,
            "各位":1
        },
    };

    var subDicts = {
        "一问":{
            "各位":1,
            "大家":1,
            "大神":1,
            "，":8
        },
        "一下":{
            "各位":1,
            "大家":1,
            "大神":1,
            "，":3
        },
        "下":{
            "各位":1,
            "大家":1,
            "大神":1,
            "，":3
        },
        "各位":{
            "网友":1,
            "大神":1,
            "，":2
        },
        "大家":{
            "，":1
        },
        "大神":{
            "，":1
        },
        "网友":{
            "，":1
        }
    };

    return prepatch(fix(Dicts,subDicts));
}

function prepatch(str){
    if (str.length <= 6){
        str = str.replace("，","");
    }
    return str;
}

function randomSubfix(){
    var Dicts = {
        "有":{
            "谁":1,
            "哪位":1,
            "人":1,
            "网友":1,
            "高手":1
        },
        "有没有":{
            "人":1,
            "高手":1,
            "网友":1
        },
        "哪位":{
            "网友":1,
            "高手":1,
            "知道？":1,
            "了解？":1,
            "清楚？":1,
            "晓得？":1,
            "说":1,
            "说说":1,
            "指教":1,
            "能":1,
            "能够":2
        },
        "谁":{
            "知道？":1,
            "了解？":1,
            "清楚？":1,
            "晓得？":1,
            "说":1,
            "说说":1,
            "指教":1,
            "能":1,
            "能够":2
        }
    };

    var subDicts = {
        "谁":{
            "知道？":1,
            "了解？":1,
            "清楚？":1,
            "晓得？":1,
            "能":1,
            "能够":2
        },
        "能够":{
            "说":1,
            "指教":1,
            "指点":1,
            "给点建议吗？":1
        },
        "能":{
            "说":1,
            "指教":1,
            "指点":1,
            "给点建议？":1
        },
        "高手":{
            "知道吗？":1,
            "了解吗？":1,
            "清楚吗？":1,
            "晓得吗？":1,
            "能够":2
        },
        "网友":{
            "知道吗？":1,
            "了解吗？":1,
            "清楚吗？":1,
            "晓得吗？":1,
            "能够":2
        },
        "人":{
            "知道吗？":1,
            "了解吗？":1,
            "清楚吗？":1,
            "晓得吗？":1
        },
        "说":{
            "说看？":1,
            "一下":1
        },
        "说说":{
            "看？":1
        },
        "指教":{
            "一下":1
        },
        "指点":{
            "一下":1
        },
        "一下":{
            "吗？":3
        },
    };
    return subpatch(fix(Dicts,subDicts));
}

function subpatch(str){
    if (str.match("有没有")){
        str = str.replace("吗？","？");
    }
    if (str.match("哪位")){
        str = str.replace("吗？","？");
    }
    if (str.match("谁")){
        str = str.replace("吗？","？");
    }
    return str;
}

function Levenshtein(str1,str2){
    var len1 = str1.length,
        len2 = str2.length,
        dif = [],
        temp,
        similarity;
    for (var i=0;i<=len1 ;i++ ){
        dif[i] = [];
        for (var j=0;j<=len2 ;j++ ){
            dif[i][j] =0;
        }
    }
    for (var k = 0;k<=len1 ;k++ ){
        dif[k][0] = k;
    }
    for (var v = 0;v<=len2 ;v++ ){
        dif[0][v] = v;
    }
    for (var i=1;i<=len1 ;i++ ){
        for (var j=1;j<=len2 ;j++ ){
            if (str1.charAt(i-1) == str2.charAt(j-1)){
                temp = 0;
            }else {
                temp = 1;
            }
            dif[i][j] = Math.min(dif[i-1][j-1]+temp,dif[i][j-1]+1,dif[i-1][j]+1);
        }
    }
    similarity = 1 - dif[len1][len2] / Math.max(len1,len2);
    return similarity;
}

var modify = require("./modify");

function Randomtitle(text){
    var equal = [
        ["哪位","谁","哪个"],
        ["请问","问问","问一下"],
        ["请教","咨询","求助","打听"],
        ["下","一下"],
        ["如何","怎么","怎样"],
        ["哪里","哪儿"],
        ["知道","晓得","懂得","了解","熟悉","清楚"]
    ];
    var head = text.substr(0,text.length/2);
    var tail = text.substr(text.length/2);

    equal.forEach(group=>{
        group.map(str=>head.match(str))
        .filter(x=>!!x)
        .forEach(x=>{
            var _x = x;
            while (x == _x){
                _x = Random.choice(group);
            }
            head = head.replace(x,_x);
        });
    });

    if (!tail.match(/[\?？。……！]$/)){
        tail += "？";
    }

    text = head + tail;

    if (text.length >= 18){
        return text;
    }

    var options = modify(text);
    var any = true;
    do{
        var subfix = Random.choice(options);
        if (subfix && text.length > subfix.length){
            var tail = text.substr(text.length-subfix.length);
            var like = Levenshtein(tail,subfix);
            if (like < 0.3){
                any = false;
            }
        }
    }
    while (any);

    text += subfix;
    return text;
}

module.exports = Randomtitle;
