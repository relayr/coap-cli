#! /usr/bin/env node

var program = require('commander')
  , version = require('./package').version
  , request = require('coap-dtls').request
  , URL     = require('url')
  , through = require('through2')
  , method  = 'GET' // default
  , util = require('util')
  , cbor = require('cbor')
const path    = require('path');
const fs      = require('fs');


var readAndWrapDER = function(path) {
  var return_value = false;
  return_value = fs.readFileSync(path);
  return_value = new Buffer(return_value.toString())
  return return_value;
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
  .option('    --cacert [path]', 'Path to a DER-encoded CA certificate (if that matters).', false)
  .option('    --cpcert [path]', 'Path to a DER-encoded certificate representing the counterparty\'s identity.', false)
  .option('    --ourcert [path]', 'Path to a DER-encoded certificate representing our identity.', false)
  .option('    --psk [value]', 'A base64-encoded pre-shared key.', false)
  .option('    --pskident [value]', 'A PSK representing our identity.', false)
  .usage('[command] [options] url')


;['GET', 'PUT', 'POST', 'DELETE'].forEach(function(name) {
  program
    .command(name.toLowerCase())
    .description('performs a ' + name + ' request')
    .action(function() { method = name })
})

program.parse(process.argv)

if (!program.args[0] || ('string' !== typeof program.args[0])) {
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

var dtls_opts = false;
var ident_supplied = false;

switch (url.protocol) {
  case 'coaps:':
    /* Now we look for DTLS-related options... */
    dtls_opts = {};
    // Error-checking params....

    if ((program.psk) || (program.pskident)) {
      if (!((program.psk) && (program.pskident))) {
        // If we have one thing, and not the other, we will fail.
        console.log('You must supply BOTH psk and pskident if you supply either. Failing...');
        process.exit(-1);
      }
      else {
        dtls_opts.psk      = new Buffer(program.psk.toString());
        dtls_opts.PSKIdent = new Buffer(program.pskident.toString());
        ident_supplied = true;   // Sufficient definition of identity.
      }
    }
    else {
      // TODO: Disqualify all PSK ciphersuites.
    }

    // Prepping the pass-in to node-coap...
    if (program.cacert) {
      var _temp = readAndWrapDER(program.cacert.toString());
      if (Buffer.isBuffer(_temp)) dtls_opts.CACert = _temp;
    }
    if (program.cpcert) {
      var _temp = readAndWrapDER(program.cpcert.toString());
      if (Buffer.isBuffer(_temp)) {
        dtls_opts.peerPublicKey = _temp;
        ident_supplied = true;   // Sufficient definition of identity.
      }
    }
    if (program.ourcert) {
      var _temp = readAndWrapDER(program.ourcert.toString());
      if (Buffer.isBuffer(_temp)) {
        dtls_opts.key = _temp;
        ident_supplied = true;   // Sufficient definition of identity.
      }
    }

    if (!ident_supplied) {
      console.log('DTLS was desired, but insufficient identity information was given. Failing...')
      process.exit(-1)
    }

  case 'coap:':
    break;
  default:
    console.log('Bad URL. Protocol is not coap(s).')
    process.exit(-1)
    break;
}


req = request(url, dtls_opts, (req) => {
  req.on('response', (res) => {
    // print only status code on empty response
    if (!res.payload.length) {
      if (!program.quiet) {
        process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\n')
      }
      process.exit(0);
    }

    if (program.cbor) {
      cbor.decodeFirst(res.payload, (err, obj) => {
        if (err != null) {
          console.log(err);
          process.exit(0);
        }
        else {
          console.log(`${res.code}: ${JSON.stringify(obj)}`);
          process.exit(0);
        }
      });
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
        process.exit(0);
      })).pipe(process.stdout)
    }

    //if (method === 'GET' || method === 'DELETE' || program.payload) {
      //return
    //}
  });


  if (program.payload) {
    if (program.cbor) {
      req.end(cbor.encode(program.payload));
    }
    else {
      req.end(program.payload);
    }
  }
  else {
    req.end();
  }
});
