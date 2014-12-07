// TODO: Stream from server to client !
// see http://pedromtavares.wordpress.com/2012/12/28/streaming-audio-on-the-web-with-nodejs/

var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var dl = require('delivery');
var config = require('./config').params;

app.listen(config.port);
console.log('Server running at http://' + config.address + ':' + config.port + '/');

function handler (req, res){
  var path = req.url.split('/');
  if(path[1] == 'sounds'){
    fs.readFile(__dirname + req.url,
      function (err, data) {
        if (err) {
          res.writeHead(500);
          return res.end('Error loading ' + req);
        }
        // else
        res.writeHead(200);
        res.end(data);
      }
    );
  }
}


io.on('connection', function (socket) {
  socket.emit('set-dir', config.address + ':' + config.port + '/' + config.dir);
  fs.readdir(config.dir, function (err, files){
    socket.emit('set-library', files);
  });

  socket.on('delete-song', function (name){
      console.log('delete');
      filename = name.replace(/\s|'/g, '-');
      fs.unlink(config.dir + filename, function (err){
        if(!err){
          console.log(filename + ' removed.');
        }
      })
    });
  })

// find better name
var remote = io
  .of('/remote')
  .on('connection', function (socket){
    var delivery = dl.listen(socket);
    delivery.on('receive.success', function (file){
      file.name = file.name.replace(/\s|'/g, '-'); // spaces or quotes brokes player request for reading
      fs.writeFile(config.dir + file.name, file.buffer, function (err){
        if(err){
          console.log('File could not be saved.\n' + err);
        } else {
          console.log(file.name + ' saved.');
          io.emit('saved-song'); // tell remote it can send next song in stack
          io.emit('new-song', file.name); // tell remote and player a new song has been added and what's its name
        }
      });
    })
  })

