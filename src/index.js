import http from 'http';
import fs from 'fs';
import saxStream from 'sax-stream';
import { createLogger } from 'bunyan';

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
  var body = "{\"properties\":[";
  var request = http.get("http://panel.siprop.com/propiedades/export/id/utq0yl2wda", (response) => {
      var downloadFile = fs.createWriteStream('data.json', {'flags': 'w'});
      downloadFile.write("{\"properties\":[");
      var saxParser = saxStream({
        strict: true,
        tag: 'ad'
      });
      saxParser.on('data', function(item){
          downloadFile.write(JSON.stringify(nodeToJson(item)));
          downloadFile.write(",");
          body += JSON.stringify(nodeToJson(item)) + ",";
      });
      saxParser.on('end', function(){
          downloadFile.write("]}");
          body += "]}"
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(body);
      });
      var stream = response.pipe(saxParser);
    //   response.addListener('data', function (chunk) {
    //     downloadFile.write(chunk);
    //     body += chunk;
    //   });
    //   response.addListener("end", function() {
    //     downloadFile.end();
    //     res.writeHead(200, {'Content-Type': 'text/plain'});
    //     res.end(body);
    //   });

  });
}).listen(1337, '127.0.0.1');

logger.info('Server running at http://127.0.0.1:1337/');
