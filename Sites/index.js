var Sites = [];
var fs = require("fs");
var files = fs.readdirSync(__dirname)
.filter(file=>/.js$/.test(file))
.filter(file=>!/index/.test(file))
.map(file=>file.replace('.js',''))
.forEach(file=>Sites.push(require("./"+file)));

Sites.search = function (url){
    return this.filter(v=>{
        return new RegExp(v.host).test(url)
    })[0]
}
module.exports = Sites;