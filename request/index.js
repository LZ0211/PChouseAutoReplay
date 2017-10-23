"use strict";
var http = require('http'),
    https = require('https'),
    zlib = require('zlib'),
    URL = require('url'),
    Stream = require('stream'),
    inherits = require('util').inherits,
    querystring = require('querystring'),
    cookies = require('./cookies'),
    mime = require('./mime'),
    utils = require('./utils'),
    Cache = require("./cache"),
    config = require("./config"),
    path = require("path"),
    fs = require("fs"),
    Headers = require('./headers');

var protocols = {
  'http:': http,
  'https:': https
};

function binary(res,fn){
    var data = [];
    var method = res.req.method;
    var status = res.statusCode;
    res.on('data', function(chunk){
        data.push(chunk);
    });
    res.on('end', function () {
        var buffer = Buffer.concat(data);
        var length = res.headers['content-length'];
        if (!length){
            if (status == 206){
                length = parseInt(res.headers['content-range'].split("/")[1]);
            }else {
                return fn(null, res, buffer);
            }
        }
        var len = buffer.length;
        if (len >= length - 20){
            return fn(null, res, buffer);
        }
        if (method == "HEAD"){
            return fn(null,res,buffer);
        }
        var err = new Error("MISS DATA");
        fn(err,null,buffer);
    });
}
var Parser = {
    "image":binary,
    "bin":binary,
    "json":function(res, fn){
        var text = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            text += chunk;
        });
        res.on('end', function(){
            var err = null,body=null;
            try {
                body = text && JSON.parse(text);
            } catch (e){
                err = e;
                err.rawResponse = text || null;
                err.statusCode = res.statusCode;
            } finally {
                fn(err, res, body);
            }
        });
    },
    "text":function(res, fn){
        var text = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            text += chunk;
        });
        res.on('end', function (){
            fn(null, res, text);
        });
    },
    "form":function (res, fn){
        var text = '';
        res.setEncoding('ascii');
        res.on('data', function(chunk){
            text += chunk;
        });
        res.on('end', function(){
            try {
                fn(null, querystring.parse(text));
            } catch (err) {
                fn(err);
            }
        });
    }
};

function parse(res,fn){
    var contentType = res.headers['content-type'] || "";
    var mime = utils.type(contentType);
    var charset = utils.charset(contentType);
    if (utils.isJSON(mime)){
        return Parser.json(res,fn);
    }else if (utils.isText(mime)){
        if (charset && charset.match(/utf-?8/i)){
            return Parser.text(res,fn);
        }else {
            return Parser.bin(res,fn);
        }
    }else {
        return Parser.bin(res,fn);
    }
}

mime.define({
  'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-data']
});

function noop(){}

function Request(url,method) {
    Stream.call(this);
    this.headers = {};
    this.method = method || "GET";
    this.url = encodeURI(url);
    this._headers = {};
    this._query = {};
    this._data = {};
    this._timeout = config.Timeout || 5000;
    this._callback = [];
    this._agent = false;
    this._redirects = 0;
    this._maxRedirects = config.maxRedirects || 5;
    this._redirectList = [];
    this._maxReconnects = config.maxReconnects || 3;
    this.writable = true;
    this.setHeader(new Headers(url));
    this.cookie();
    this.query(URL.parse(url).query);
    return this.init();
}
inherits(Request,Stream);
var Proto = Request.prototype;
Proto.init = function (){
    this.on("error",e=>{return e;});
    if (this.method === "GET"){
        var mime = path.extname(URL.parse(this.url).pathname).replace(".","");
        this.accept(mime);
    }
    if (this.method === "POST"){
        this.type("form");
    }
    return this;
};
Proto.reconnect = function (times){
    this._maxReconnects = times;
    return this;
};
Proto.timeout = function (ms){
    this._timeout = ms;
    return this;
};
Proto.use = function (fn){
    fn(this);
    return this;
};
Proto.set = Proto.setHeader = function (key,val){
    if (typeof key == "object"){
        for (var k in key) {
          this.setHeader(k, key[k]);
        }
        return this;
    }
    this._headers[key.toLowerCase()] = val;
    this.headers[key] = val;
    return this;
};
Proto.del = Proto.unsetHeader = function (){
    for(var i=0;i<arguments.length;i++){
        var key = arguments[i].toLowerCase();
        delete this._headers[key];
        for(var k in this.headers){
            if(key == k.toLowerCase()){
                delete this.headers[k];
            }
        }
    }
    return this;
};
Proto.getHeader = function (key){
    return this._headers[key.toLowerCase()];
};
//Proto.get = Proto.getHeader;
//Proto.set = Proto.setHeader;
//Proto.unset = Proto.unsetHeader;
Proto.abort = function(){
  if (this._aborted) {
    return this;
  }
  this._aborted = true;
  this.req && this.req.abort(); // node
  this.emit('abort');
  return this;
};
Proto.toJSON = function(){
  return {
    method: this.method,
    url: this.url,
    timeout:this._timeout,
    data: this._data,
  };
};
Proto.send = function(data){
    var isobj = utils.isObject(data);
    var type = this.getHeader('content-type');

    // merge
    if (isobj && utils.isObject(this._data)) {
        for (var key in data) {
            this._data[key] = data[key];
        }
    } else if (utils.isString(data)) {
        // default to x-www-form-urlencoded
        if (!type) this.type('form');
        type = this.getHeader('content-type');
        if ('application/x-www-form-urlencoded' == type) {
            this._data = querystring.parse(this._data);
            data = querystring.parse(data);
            this.send(data);
        } else {
            if (utils.isObject(this._data)){
                this._data = "";
            }
            this._data += data;
        }
    } else {
        this._data = data;
    }
    if (!type) this.type('json');
    return this;
};
Proto.redirects = function (n){
    this._maxRedirects = n;
    return this;
};
Proto.type = function(type){
    this.setHeader('Content-Type', ~type.indexOf('/') ? type : mime.lookup(type));
    return this;
};
Proto.accept = function(type){
    this.setHeader('Accept',~type.indexOf('/') ? type : mime.lookup(type));
    return this;
};
Proto.charset = function(char){
    if (this.method === "GET" && char){
        this.setHeader('Accept-Charset',char);
    }
    if (this.method === "POST" && char){
        this.setHeader('Content-Type',this.getHeader('Content-Type') + "; charset=" + char.toUpperCase());
    }
    return this;
};
Proto.referer = function(ref){
    this.setHeader('Referer', encodeURI(ref));
    return this;
};
Proto.auth = function(user, pass){
    var str = new Buffer(user + ':' + pass).toString('base64');
    this.setHeader('Authorization', 'Basic ' + str);
    return this;
};
Proto.ca = function(cert){
    this._ca = cert;
    return this;
};
Proto.query = function(val){
    if (utils.isObject(val)){
        for (var key in val) {
            this._query[key] = val[key];
        }
    }else if (utils.isString(val)){
        val = querystring.parse(val);
        return this.query(val);
    }
    return this;
};
Proto.callback = function (err,res,buffer){
    if (utils.isFunction(err)){
        this._callback.push(err);
    }else {
        this._callback.forEach(function (fn){
            fn(err,res,buffer);
        });
    }
};
Proto.redirect = function(res){
    var url = res.headers.location;
    var ref = this.url;
    if (!url) {
        return this.callback(new Error('No location header for redirect'), res);
    }
    url = URL.resolve(this.url, url);
    delete this.req;

    // redirect
    this.url = url;
    this._data = {};
    this._query = {};
    this.setHeader(new Headers(url));
    this.cookie();
    this.referer(ref);
    this.query(URL.parse(url).query);
    this.emit('redirect', res);
    this._redirectList.push(this.url);
    this.end();
    return this;
};
Proto.agent = function(agent){
    if (!arguments.length) return this._agent;
    this._agent = agent;
    return this;
};
Proto.cookie = function (cookie){
    var cookie = cookie || cookies.getCookie(this.url);
    cookie ? this.setHeader("Cookie",cookie) : this.unsetHeader("Cookie");
    return this;
};
Proto.pipe = function(stream, options){
    this.piped = true;
    var self = this;
    this.end();
    this.req.on('response', function(res){
        // redirect
        var redirect = utils.isRedirect(res.statusCode);
            if (redirect && self._redirects++ !== self._maxRedirects) {
            return self.redirect(res).pipe(stream, options);
        }
        if (res.statusCode !== 200){
            return self.pipe(stream, options);
        }
        if (utils.needUnzip(res)) {
            res.pipe(zlib.createUnzip()).pipe(stream, options);
        } else {
            res.pipe(stream, options);
        }
        res.on('end', function(){
            self.emit('end');
        });
    });
    // this.req.on('error',function (err){
    //     self.pipe(stream, options);
    // });
    return stream;
};
Proto.request = function (){
    var self = this;
    var options = {};
    var querystr = querystring.stringify(this._query);
    var url = this.url;
    if (!~url.indexOf('http')) url = 'http://' + url;
    //var parsed = URL.parse(url, true);
    //url = parsed.protocol + "//" + parsed.host + parsed.pathname;
    //if (querystr) url += "?" + querystr;
    var parsedUrl = URL.parse(url, true);
    this.protocol = parsedUrl.protocol;
    this.host = parsedUrl.host;
    options.method = this.method;
    options.headers = this.headers;
    options.host = parsedUrl.host;
    options.hostname = parsedUrl.hostname;
    options.port = parsedUrl.port;
    options.path = parsedUrl.pathname + (querystr ? "?"+querystr : "");
    options.ca = this._ca;
    options.agent = this._agent;
    var req = this.req = protocols[parsedUrl.protocol].request(options);
    req.on('drain', function(){
        self.emit('drain');
    });
    req.on('error', function(e){
        self.emit('error',e);
        //if (self._aborted) return;
        //if (self.res) return;
        self.callback(e);
    });
    req.on('response',function (res){
        self.emit("response",res);
    });
    req.setTimeout(this._timeout,function(){
        req.abort();
        self.emit("timeout");
    });
    return req;
};
Proto.end = function (callback){
    var self = this;
    var req = this.request();
    callback && this.callback(callback);

    function fn(err,res,buffer){
        self.buffer = buffer;
        self.emit('end');
        err ? self.callback(err) : self.callback(null, res, buffer);
    }
    req.on('response',function (res){
        self.res = res;
        var redirect = utils.isRedirect(res.statusCode);
        cookies.setCookie(self.url,res);

        if (self.piped) return;
        // redirect
        if (redirect && self._redirects++ !== self._maxRedirects){
            return self.redirect(res);
        }
        if (utils.needUnzip(res)){
            utils.unzip(req, res);
        }
        parse(res,fn);
    });
    if (this.method == "POST"){
        var data = this._data;
        if (typeof data == "object"){
            data = querystring.stringify(this._data).replace(/%20/g,"+");
        }
        req.setHeader('Content-Length',data.length);
        req.write(data);
    }
    req.end();
    return this;
};
Proto.promise = function (){
    var self = this;
    var times = 0,maxtimes = this._maxReconnects;
    var defer = function (resolve,reject){
        self.end(function(err,res,buffer){
            if (res && /^20.$/.test(res.statusCode) && buffer){
                resolve(buffer);
                //reject = null;
            }else if (err){
                ++times < maxtimes ? self.end() : reject(err.code);
            }else if (buffer){
                reject(buffer);
                //resolve = null;
            }else {
                ++times < maxtimes ? self.end() : reject(res.statusCode);
            }
        });
    };
    return new Promise(defer);
};
Proto.then = function (success,fail){
    return this.promise().then(success,fail);
};


function get(url,data,fn){
    var req = new Request(url, 'GET');
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.query(data);
    if (fn) req.end(fn);
    return req;
}
function post(url,data,fn){
    var req = new Request(url, 'POST');
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
}
function ajax(url, options){
    if ( typeof url == "object" ) {
        options = url;
        url = undefined;
    }
    options = options || {};
    options.url = url || options.url;
    options.method = options.method || options.type || "GET";
    options.timeout = options.timeout || 15000;
    var req = new Request(options.url, options.method);
    options.timeout && req.timeout(options.timeout);
    options.dataType && req.accept(options.dataType);
    options.data && req.send(options.data);
    options.contentType && req.type(options.contentType);
    options.headers && req.setHeader(options.headers);
    return req.setHeader("X-Requested-With","XMLHttpRequest").then(options.success,options.error);
}
function head(url,data,fn){
    var req = new Request(url, 'HEAD');
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.query(data);
    if (fn) req.end(fn);
    return req;
}
function put(url,data,fn){
    var req = new Request(url, 'PUT');
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
}

function breakpoint(url,callback){
    var _call = callback;
    callback = function (){
        _call.apply(null,arguments);
        _call = noop;
    };
    head(url).end(function (err,res,buf){
        if(err)return callback(err);
        var headers = res.headers;
        var isRanges = headers['accept-ranges'] == "bytes";
        var size = headers['content-length'];
        var file = decodeURIComponent((headers['content-diposition'] || "").split("filename=")[1] || path.basename(URL.parse(url).pathname));
        var limit = 1024 * 1024 * 5;
        if (size < limit){
            return get(url).then(function (data){
                fs.writeFile(file,data,callback);
            },callback);
        }
        if (!isRanges){
            var error = new Error("NOT SUPPORT RANGES TRANSFER");
            return callback(error);
        }

        function down(){
            var current = 0;
            var array = [];
            while (current < size){
                array.push(current);
                current += limit;
            }
            fs.open(file, 'w', function(err,fd){
                if(err)return callback(err);
                fs.open(file + ".cfg","a+",function (err,cfg){
                    if (err)return callback(err);
                    fs.fstat(cfg, function (err,stats){
                        if (err)return callback(err);
                        var position = stats.size;
                        function fn(ranges){
                            array = array.filter(head=>!~ranges.indexOf(head));
                            utils.parallel(array,function (head,next){
                                var tail = Math.min(head+limit-1,size-1);
                                var length = tail - head;
                                var range = "bytes=" + head + "-" + tail;
                                get(url).setHeader("Range",range).end(function (err,res,data){
                                    if (err)return callback(err);
                                    /*if (data.length !== length){
                                        limit = data.length;
                                        return down();
                                    }*/
                                    fs.write(fd,data,0,length,head,function (err,bytes,buf){
                                        if (err)return callback(err);
                                        var buffer = new Buffer(8);
                                        buffer.writeInt32LE(head,0);
                                        fs.write(cfg,buffer,0,8,position,function (err){
                                            if (err)return callback(err);
                                            position += 8;
                                            next();
                                        });
                                    });
                                });
                            },function (){
                                fs.close(fd,function(err){
                                    if (err)return callback(err);
                                    fs.close(cfg,function (err){
                                        if (err)return callback(err);
                                        fs.unlink(file + ".cfg",function (err){
                                            if (err)return callback(err);
                                            callback(null);
                                        });
                                    });
                                });
                            });
                        }
                        if (!position){
                            return fn([]);
                        }
                        var buf = new Buffer(position);
                        fs.read(cfg,buf,0,position,0,function (err,bytes,buf){
                            if (err)return callback(err);
                            //读取记录;
                            var len = bytes/8;
                            var ranges = [];
                            var pos = 0;
                            var line;
                            for (var i=0;i<len;i++){
                                pos = 8 * i;
                                line = buf.slice(pos,pos + 8);
                                ranges.push(line.readInt32LE(0));
                            }
                            return fn(ranges);
                        });
                    });
                });
            });
        }

        down();

    });
}

function download(url){
    get(url).pipe(fs.createWriteStream(path.basename(URL.parse(url).pathname)));
}
//console.log()
module.exports = {
    Request : Request,
    get : get,
    post : post,
    head : head,
    put : put,
    ajax : ajax,
    download: download
}

/*var buf = new Buffer(8);
buf.writeInt32LE(8192,0);
console.log(buf.readInt32LE(0))*/