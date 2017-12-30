import http from 'http';
import fs from 'fs';
import path from 'path';
import saxStream from 'sax-stream';
import { createLogger } from 'bunyan';

const util = require('util');
const logger = createLogger({name: 'feedparser'});

function nodeToJson(node){
    if (node.children != undefined){
        return nodeToJson(node.children);
    }else{
        var jsonNode = {}
        for (var key in node){
            if (key == 'parent'){
                break;
            }
            var value = node[key];
            if (value.children != undefined){
                jsonNode[key] = nodeToJson(value.children);
            }else{
                jsonNode[key] = value.value;
            }
        }
        return jsonNode;
    }
}

http.createServer((req, res) => {
    var parse = false;
    // Cache.
    try{
        var stats = fs.statSync(path.resolve(__dirname, '../data.json'));
        var mtime = new Date(util.inspect(stats.mtime));
        var currentDate = new Date();
        var hours = Math.abs(currentDate.getTime() - mtime.getTime()) / 3600000;
        if (hours > 12){
            parse = true;
        }
    }catch(e){
        console.log(e);
        parse = true;
    }

    if (parse){
        var request = http.get("http://panel.siprop.com/propiedades/export/id/utq0yl2wda", (response) => {
            var downloadFile = fs.createWriteStream('data.json', {'flags': 'w'});
            var first = true;
            downloadFile.write("{\"properties\":[");
            var saxParser = saxStream({
                strict: true,
                tag: 'ad'
            });
            var body = "{\"properties\":[";
            saxParser.on('data', function(item){
                if (first){
                    first = false;
                }else{
                    downloadFile.write(",");
                }
                downloadFile.write(JSON.stringify(nodeToJson(item)));
                body += JSON.stringify(nodeToJson(item)) + ",";
            });
            saxParser.on('end', function(){
                downloadFile.write("]}");
                body += "]}"
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(body);
            });
            var stream = response.pipe(saxParser);
        });
    }else{
        const data = require('../data.json');
        console.log("Cache!");
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(data));
    }
}).listen(1337, '127.0.0.1');

logger.info('Server running at http://127.0.0.1:1337/');
