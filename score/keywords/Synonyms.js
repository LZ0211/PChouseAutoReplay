function Token(rule){
    var fn = "return ("
    fn += rule
        .replace(/([^|&\(\)]+)/g,function ($,$1){
            var found = $1.match(/\{([^{}]+)\}/);
            if(found){
                return 'this["'+ found[1] +'"](text)';
            }else {
                return "text.match('"+$1+"')";
            }
        })
        .replace(/&/g," && ")
        .replace(/\|/g," || ");
    fn += ")";
    return new Function("text",fn)
}

var Synonyms = require('./同义词');
for (var x in Synonyms){
    Synonyms[x] = Token(Synonyms[x]);
}

module.exports = Synonyms