#! /usr/bin/env node

var program = require('commander')
  , version = require('./package').version
  , request = require('node-coap').request
  , URL     = require('url')
  , through = require('through2')
  , method  = 'GET' // default
  , util = require('util')
  , cbor = require('cbor')
const path    = require('path');
const fs      = require('fs');


var readAndWrapDER = function(path) {
  return fs.readFileSync(path);
}

var psk = function(val) {
  return new Buffer(val.toString());
};

var pskident = undefined;

program
  .version(version)
  .option('-o, --observe', 'Observe the given resource', 'boolean', false)
  .option('-n, --no-new-line', 'No new line at the end of the stream', 'boolean', true)
  .option('-p, --payload <payload>', 'The payload for POST and PUT requests')
  .option('-q, --quiet', 'Do not print status codes of received packets', 'boolean', false)
  .option('-c, --non-confirmable', 'non-confirmable', 'boolean', false)
  .option('-x, --cbor', 'Encode/decode the payload with CBOR', 'boolean', false)
  .option('    --cacert', 'Path to a DER-encoded CA certificate (if that matters).', 'cacert')
  .option('    --cpcert', 'Path to a DER-encoded certificate representing the counterparty\'s identity.', 'cpcert')
  .option('    --ourcert', 'Path to a DER-encoded certificate representing our identity.', 'ourcert')
  .option('    --psk [value]', 'A base64-encoded pre-shared key.', 'psk')
  .option('    --pskident [value]', 'A PSK representing our identity.', 'pskident')
  .usage('[command] [options] url')


;['GET', 'PUT', 'POST', 'DELETE'].forEach(function(name) {
  program
    .command(name.toLowerCase())
    .description('performs a ' + name + ' request')
    .action(function() { method = name })
})

program.parse(process.argv)

if (!program.args[0]) {
  program.outputHelp()
  process.exit(-1)
}

var url = URL.parse(program.args[0])
url.method = method
url.observe = program.observe

url.confirmable = !program.nonConfirmable

if (!url.hostname) {
  console.log('Bad URL. No hostname.')
  process.exit(-1)
}

var dtls_opts = undefined;

switch (url.protocol) {
  case 'coaps:':
    /* Now we look for DTLS-related options... */
    dtls_opts = {};
    if (program.cacert) dtls_opts.CACert        = readAndWrapDER(program.cacert);
    if (program.cpcert) dtls_opts.peerPublicKey = readAndWrapDER(program.cpcert);
    if (program.ourcert) dtls_opts.key          = readAndWrapDER(program.ourcert);
    if (program.psk) dtls_opts.psk              = new Buffer(program.psk.toString());
    if (program.pskident) dtls_opts.PSKIdent    = new Buffer(program.pskident.toString());
  case 'coap:':
    break;
  default:
    console.log('Bad URL. Protocol is not coap(s).')
    process.exit(-1)
    break;
}



req = request(url, dtls_opts, (req) => {
  req.on('response', function(res) {
    // print only status code on empty response
    if (!res.payload.length && !program.quiet) {
      process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\n')
    }
    
    if (program.cbor) {
      var d = new cbor.Decoder();
      
      d.on('data', function(obj){
        console.log(util.inspect(obj,{ depth: null }));
      });
      
      res.pipe(d);
    }
    else {
      res.pipe(through(function addNewLine(chunk, enc, callback) {
        if (!program.quiet) {
          process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\t')
        }
        if (program.newLine && chunk) {
          chunk = chunk.toString('utf-8') + '\n'
        }
        
        this.push(chunk)
        callback()
      })).pipe(process.stdout)
    }
    // needed because of some weird issue with
    // empty responses and streams
    if (!res.payload.length) process.exit(0)


    if (method === 'GET' || method === 'DELETE' || program.payload) {
      if (program.cbor) {
        req.end(cbor.encode(program.payload));
      }
      else {
        req.end(program.payload);
      }
      return
    }

    if (program.cbor) {
      var e = new cbor.Encoder();
      process.stdin.pipe(e).pipe(req)
    }
    else {
      process.stdin.pipe(req)
    }
  });
});
