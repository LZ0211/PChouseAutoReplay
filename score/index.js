var keyWords = require("./keywords");
var Synonyms = require("./keywords/Synonyms");
var weights = require("./keywords/权重");
var WORDS = require("./words");
/*var mmseg = require("./segment/mmseg");
var Dict = require("./dict");*/

keyWords["补充"] = WORDS.filter(function (v,k){
    return v.length <= 4;
});

for (var x in WORDS.data){
    weights[x] = 0;
}

function mmh3(key, seed) {
    var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
    
    remainder = key.length & 3; // key.length % 4
    bytes = key.length - remainder;
    h1 = seed;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;
    
    while (i < bytes) {
        k1 = 
          ((key.charCodeAt(i) & 0xff)) |
          ((key.charCodeAt(++i) & 0xff) << 8) |
          ((key.charCodeAt(++i) & 0xff) << 16) |
          ((key.charCodeAt(++i) & 0xff) << 24);
        ++i;
        
        k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
        h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }
    
    k1 = 0;
    
    switch (remainder) {
        case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
        case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
        case 1: k1 ^= (key.charCodeAt(i) & 0xff);
        
        k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
        h1 ^= k1;
    }
    
    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

var cache = {
    re:{},
    word:{},
    keyword:{},
    splitwords:{},
};

function format(text){
    var rules = [
        [/此问题来源于.*/gi,''],
        [/此问题整合自.*/gi,''],
        [/(&nbsp;)+/g," "],
        [/\?{2,}\s?/g,"\n"],
        [/ +/g," "],
        [/(土巴兔|齐家|百度(知道)|搜狗|房天下|安居客|九正装修|装修123|吉屋|爱装网|一起装修网)/g,"太平洋家居"],
        [/(第?[0-9一二三四五六七八九]{1,2}[\.、：:]\D)/g,"\n$1"],
        [/([\(（第][一二三四五六七八九0-9]{1,2}[\)）]\D)/g,"\n$1"],
        [/&nbsp;/g,""],
        [/\n +/g,"\n"],
        [/[\r\n]+/g,"\n"]
    ];
    rules.forEach(function(rule){
        text = text.replace(rule[0],rule[1]);
    });
    return text.trim();
}

function searchKeyWord(object,text){
    var keywords = [];
    var anyfound = false;
    var key;
    Object.keys(object).forEach(function (key){
        var re,word,found,val=0,log=[];
        if (key in cache.re){
            re = cache.re[key];
        }else {
            re = cache.re[key] = new RegExp(key,"ig");
        }
        //re = new RegExp(key,"ig");
        found = re.exec(text);
        while (found){
            val += 1;
            log.push({text:found[0],index:found.index});
            found = re.exec(text);
        }
        var fn = Synonyms[key] ? Synonyms[key].bind(Synonyms) : null;
        var str = text;
        if (fn && str && !val){
            var found = fn(str);
            val = 0;
            log = [];
            while (found && str){
                val += 1;
                log.push({text:found[0],index:found.index});
                str = str.substring(found.index + found[0].length);
                found = fn(str);
            }
        }
        var arg = object[key];
        if (typeof arg === "number"){
            if (val > 0){
                keywords.push({
                    name:key,
                    value:Math.sqrt(val * arg),
                    found:log
                });
                anyfound = true;
            }
        }else {
            var next = searchKeyWord(arg,text);
            if (next){
                val = val || 0.5;
                //val += next.length;
                keywords.push({
                    name:key,
                    value:val,
                    found:log,
                    next:next
                });
                anyfound = true;
            }else if (log.length){
                keywords.push({
                    name:key,
                    value:Math.sqrt(val),
                    found:log
                });
                anyfound = true;
            }
        }
    });
    if (anyfound) return keywords
    return null;
}

function getDeepth(keywords){
    var deep = 0;
    keywords = keywords.filter(x=>x);
    if (keywords.length){
        deep += 1;
    }
    return getDeepth
    while (keywords.length){
        deep += 1;
        keywords = keywords.filter(x=>x.next);
        var temp = [];
        keywords.forEach(x=>temp=temp.concat(x.next));
        keywords = temp;
    }
    return deep;
}

function filterWords(words){
    var logs = {};
    words.forEach(function (word){
        if (word.next){
            word.next = filterWords(word.next);
        }
        if (word.value >= 1){
            logs[word.name] = getDeepth()
        }
    });
}

function requirementsAnalysis(text){
    if (!text){
        return null;
    }
    /*var hash = mmh3(text,1);
    if (!cache.keyword[hash]){
        cache.keyword[hash] = searchKeyWord(keyWords,text);
    }
    return cache.keyword[hash];*/
    return searchKeyWord(keyWords,text);
}

function filterTree(need,tree){
    var arr = [];
    need = need || [];
    tree = tree || [];
    tree.forEach(node=>{
        var found = need.filter(element=>element.name == node.name)[0];
        if (found){
            arr.push(node);
            if (node.next){
                node.next = filterTree(found.next,node.next)
            }
        }
    });
    if (!arr.length) return null;
    return arr;
}

function calculate(questions,answers){
    questions = questions || [];
    answers = answers || [];
    var points = 0;
    //分配权重
    var percent = questions.map(x=>weights[x.name] || 1);
    var sum = percent.reduce((x,y)=>x+y,1);
    percent = percent.map(x=>x/sum);
    //计算拟合度
    questions.forEach(function (question,index){
        var temp = 1;
        var answer = answers.filter(function (answer){
            return answer.name == question.name;
        })[0];
        if (!answer){
            //temp *= (1 - percent[index]);
            return;
        }
        if (question.next){
            temp = calculate(question.next,answer.next);
        }
        if (question.value < 1){
            if (answer.value > 1){
                temp *= (1 + question.value * answer.value);
            }else {
                temp *= (1 - question.value * answer.value);
            }
        }else {
            if (answer.value < 1){
                temp *= answer.value;
            }
        }
        points += temp * percent[index];
    });
    return points * fix(questions,answers);
}

//冗余修正
function fix(questions,answers){
    questions = questions || [];
    answers = answers || [];
    var points = 0;
    //重新分配权重
    var percent = answers.map(x=>weights[x.name] || 1);
    var sum = percent.reduce((x,y)=>x+y,1);
    percent = percent.map(x=>x/sum);
    answers.forEach(function (answer,index){
        var temp = 1;
        var question = questions.filter(function (question){
            return answer.name == question.name;
        })[0];
        if (question) {
            //points *= (1 - percent[index]);
            return;
        }
        if (answer.next){
            temp = fix(null,answer.next)
            //console.log(answer.value, percent[index])
        }
        temp *= answer.value;
        points += temp * percent[index];
    });
    return 1 / (points || 1);
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

function AvgLevenshtein(template,str){
    var len = Math.floor(1.1 * template.length);
    var text = str;
    var value = 0,count=0;
    while (str){
        var substr = str.substring(0,len);
        value += Levenshtein(template,substr);
        count += 1;
        str = str.substring(len);
    }
    return value/count;
}

function SplitWords(text,vectors){
    var left = [];
    vectors = vectors.sort((a,b)=>a.index-b.index);
    var _vectors = vectors.concat();
    var start = 0,length=0;
    while (vectors.length){
        var vector = vectors.shift();
        var pointer = vector.index;
        var size = vector.text.length;
        var current = start + length;
        if (current >= pointer){
            if (current <= pointer+size){
                start = pointer;
                length = size;
            }
        }else {
            left.push({text:text.substring(current,pointer),index:current});
            start = pointer;
            length = size;
        }
    }
    var subs = text.substring(start+length);
    if (subs) left.push({text:subs,index:start+length});

    var log = _vectors.map(x=>x.text);
    if (left.length){
        left = left.concat(_vectors).sort((a,b)=>a.index - b.index);
        for (var i=0;i<left.length -1 ;i++ ){
            var word = left[i];
            var that = left[i+1];
            if (word.text.length == 1 && that.text.length == 1){
                word.text += that.text;
            }
        }
        left = left.filter(x=>!~log.indexOf(x.text));
        left.forEach(vector=>WORDS.extend(vector.text));
    }
    return left;
}

function TreetoVector(keywords){
    var vectors = [];
    if (!keywords) return vectors;
    (function (keywords){
        var callee = arguments.callee;
        keywords.forEach(function (keyword){
            if (keyword.next){
                callee(keyword.next);
            }
            keyword.found.forEach(v=>vectors.push(v));
        });
    })(keywords);
    vectors.sort((a,b)=>a.index-b.index);
    var temp = [],log={};
    vectors.forEach(function (vector){
        var text = vector.text;
        var index = vector.index;
        if (log[text] == index) return;
        temp.push(vector);
        //WORDS.extend(vector.text);
        log[text] = index;
    });
    return temp;
}

function filterText(words,text){
    words.forEach(function (word){
        text = text.replace(new RegExp(word.text,"gi"),"")
    });
    return text;
}

function filterKeywords(vectors){
    var result = [];
    var current = {text:"",index:0};
    for (var i=0;i<vectors.length;i++){
        var self = vectors[i];
        if (self.index == current.index){
            if (self.size > current.size){
            }
        }else {
            result.push(current);
            current = self;
        }
    }
}
function splitKeywords(text){
    var vector = TreetoVector(requirementsAnalysis(text)).filter(x=>x.text.length > 1 || x.text in WORDS.data);
    var _vector = [].concat(vector);
    var log = _vector.map(x=>x.text);
    var words = SplitWords(text,vector);
    if (words.length){
        words = words.concat(_vector).sort((a,b)=>a.index - b.index);
        for (var i=0;i<words.length -1 ;i++ ){
            var word = words[i];
            var that = words[i+1];
            if (word.text.length == 1 && that.text.length == 1){
                word.text += that.text;
            }
        }
        words = words.filter(x=>!~log.indexOf(x.text));
    }
    words.forEach(vector=>WORDS.extend(vector.text));
    return words;
}

var sqrtSum = (function (){
    var cache = [0,1];
    return function (number){
        if (!cache[number]){
            cache[number] = arguments.callee(number-1);
        }
        return cache[number];
    }
})();

function recommand(item){
    var percent = 7;
    var title = item.title;
    var options = item.options.slice(0,15).map(format);
    item._selected = item.selected.map(x=>x.text).map(format).map(x=>({text:x,value:100}));
    var reference = title + item._selected.map(x=>x.text).join("");
    var question = requirementsAnalysis(reference);
    if (!question){
        return item;
    }
    var refs = item._selected.map(x=>x.text).concat([title]).map(requirementsAnalysis);
    var trees = options.map(requirementsAnalysis);
    var values = trees.map(tree=>refs
        .map(ref=>calculate(ref,tree))
        .map((v,i,a)=>v * Math.sqrt(a.length-i) / sqrtSum(a.length))
        .reduce((x,y)=>x+y,0)
    );
    var words = trees.map(tree=>filterTree(question,tree)).map(TreetoVector);
    var selected = values.map((value,index)=>({value:value,text:options[index],index:index}))
        .filter(object=>object.value > 0.6)
        .filter(x=>x.text.length > 25)
        .filter(x=>exclude(x.text))
        .sort((a,b)=>b.value-a.value);

    words = words.map((vectors,index)=>SplitWords(options[index],vectors));
    if (!selected.length){
        return item;
    }
    //过滤相同文本
    var tempText = options[0];
    selected.slice(1).forEach(result=>{
        var text = result.text;
        var index = result.index;
        //类似标题的文本
        if (Levenshtein(item.title,text)>0.5){
            result.value = 0;
            return;
        }
        //相同的答案
        if (Levenshtein(tempText,text)>0.8){
            result.value = 0;
            return;
        }
        tempText = text;
        return;
    });
    selected = selected.filter(object=>object.value);
    //其他加分项
    selected.forEach(result=>{
        var index = result.index;
        var text = words[index].reduce((a,b)=>a+b,"");
        result.value *= Math.log(1+text.length / 50);
    });
    selected = selected
        .filter(object=>object.value > 0.85)
        .sort((a,b)=>b.value*Math.log(b.text.length/10)-a.value&Math.log(a.text.length/10));
    item.selected = selected.slice(0,4).concat(item._selected.slice(0,2).filter(x=>exclude(x.text)))
    item.recommand = selected[0];
    return item;
}

function exclude(text){
    var list = [
        /来自知乎/,
        /浏览次数/,
        /问题来自/,
        /提问者/,
        /怎么样$/,
        /吗$/,
        /如何$/,
        /？$/
    ];
    return !list.some(re=>re.test(text));
}

function pp(text){
    var words = searchKeyWord(keyWords,text);
    console.log(JSON.stringify(words,null,2));
    var vectors = TreetoVector(words);
    console.log(vectors)
    var left =  SplitWords(text,vectors);
    console.log(JSON.stringify(left,null,2))
}

function test(Baike){
    var news = {};
    Object.keys(Baike).forEach(key=>{
        var object = Baike[key];
        if (typeof object == "object")return test(object);
        var text = key;
        var keywords = searchKeyWord(keyWords,text);
        if (!keywords) {
            news[key] = 1;
            //console.log('"' + key + '": 1,');
            return
        }
        var vectors = TreetoVector(keywords);
        var left = SplitWords(text,vectors);
        var length = left.map(x=>x.text).join("").length / text.length;
        if (left.length){
            //console.log('"' + key + '": 1,');
            //Baike[key] = left
            left.forEach(k=>news[k.text] = 1);
        }else {
            delete Baike[key];
        }
    });
    //console.log(JSON.stringify(Baike,null,2))
    //console.log(JSON.stringify(news,null,2))
}

module.exports = {
    calculate:calculate,
    searchKeyWord:searchKeyWord,
    requirementsAnalysis:requirementsAnalysis,
    recommand : recommand,
    splitKeywords:splitKeywords,
}