CoAP-CLI
============================

[![Build
Status](https://travis-ci.org/mcollina/coap-cli.png)](https://travis-ci.org/mcollina/coap-cli)

__CoAP-CLI__ is a command line interface for CoAP, built on node.js and
[node-coap](http://github.com/mcollina/node-coap).

What is CoAP?
----------------------------

> Constrained Application Protocol (CoAP) is a software protocol
intended to be used in very simple electronics devices that allows them
to communicate interactively over the Internet. -  Wikipedia

Install
----------------------------

Install [node.js](http://nodejs.org), and then from a terminal:
```
npm install coap-cli -g
```

Usage
----------------------------

```
  Usage: coap [command] [options] url

  Commands:

    get                    performs a GET request
    put                    performs a PUT request
    post                   performs a POST request
    delete                 performs a DELETE request

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -o, --observe            Observe the given resource
    -n, --no-new-line        No new line at the end of the stream
    -p, --payload <payload>  The payload for POST and PUT requests
    -q, --quiet              Do not print status codes of received packets
    -c, --non-confirmable    non-confirmable
        --cacert             Path to a DER-encoded CA certificate (if that matters).
        --cpcert             Path to a DER-encoded certificate representing the counterparty's identity.
        --ourcert            Path to a DER-encoded certificate representing our identity.
        --psk [value]        A base64-encoded pre-shared key.
        --pskident [value]   A PSK representing our identity.
```

### PUT and POST

__PUT__ and __POST__ requests body are sent from the standard
input by default. E.g.
```
echo -n 'hello world' | coap post coap://localhost/message
```

If you want to type it you can end the standard input by pressing
CTRL-D.


Generating yourself a DER-format cert
----------------------------
If you want to use an authenticated DTLS ciphersuite, you will need keys encoded in DER format.
To make those with openSSL....

    openssl ecparam -genkey -name secp256k1 -out server.pem
    openssl ecparam -genkey -name secp256k1 -out client.pem
    openssl rsa -in server.pem -pubout -outform DER -out server.der
    openssl pkcs8 -topk8 -inform PEM -outform DER -in server.pem -out server.der -nocrypt
    openssl rsa -in client.pem -pubout -outform DER -out client.der
    openssl pkcs8 -topk8 -inform PEM -outform DER -in client.pem -out client.der -nocrypt


License
----------------------------

Copyright (c) 2013 Matteo Collina

node-coap is licensed under an MIT +no-false-attribs license.
All rights not explicitly granted in the MIT license are reserved.
See the included LICENSE file for more details.
