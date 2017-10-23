var fs = require("fs");
var path = require("path");
var dir = path.join(__dirname,"./add.json");
try{
    database = JSON.parse(fs.readFileSync(dir).toString());
    process.on("exit",function (){
        fs.writeFileSync(dir,JSON.stringify(database,null,2));
    });
}catch (e){
    database = {};
    process.on("exit",function (){
        fs.writeFileSync(dir+".bak",JSON.stringify(database,null,2));
    });
}


module.exports = {
    extend : function (key){
        key = key.trim();
        if (key.length > 1 && key.length < 8 && !/[\*\+\?\/\\\|\$\^\(\)\[\]\{\}]+/.test(key) && !/^\d+$/.test(key)){
            database[key] = 1;
        }
    },
    filter:function (fn){
        var logs = {};
        for (var x in database){
            if (fn(database[x],x,database)){
                logs[x] = database[x];
            }
        }
        return logs;
    },
    data:database
}