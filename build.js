#!/usr/bin/env node

/*
Copyright 2011 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

var ejs   = require('ejs'),
    fs    = require('fs'),
    http  = require('http'),
    path  = require('path'),
    util  = require('./lib/util'),

    argv       = process.argv.slice(2),
    yuiVersion = argv.shift(),

    // Things to exclude.
    EXCLUDE_CLASSES   = [],
    EXCLUDE_CONSTANTS = [],
    EXCLUDE_FUNCTIONS = ['()', 'DEFAULT_GETTER', 'DEFAULT_SETTER'],
    EXCLUDE_VARIABLES = [],

    // Syntax templates to render.
    TEMPLATES = [
        'textmate/JavaScript - YUI 3.tmLanguage.ejs',
        'vim/after/syntax/javascript.vim.ejs'
    ],

    // Words that need to be escaped in vim syntax output.
    VIM_ESCAPE = [
        'contained', 'containedin', 'contains', 'display', 'fold', 'nextgroup',
        'oneline', 'skipempty', 'skipnl', 'skipwhite', 'transparent'
    ],

    // YUI website API details.
    YUI_API_HOST = 'stage.yuilibrary.com',
    YUI_API_PORT = 80,
    YUI_API_ROOT = '/api/v1',

    getPath;

// First, make sure we have a version number.
if (!yuiVersion) {
    process.stderr.write(
        "Usage:\n" +
        "  build.js <yui3 version>\n"
    );
    process.exit(1);
}

getPath = YUI_API_ROOT + '/classes/?sort=sortName&version=' +
        encodeURIComponent(yuiVersion);

// Hit the YUI website API to get the latest syntax data.
console.log('Fetching latest syntax data from the YUI website API');
console.log('http://' + YUI_API_HOST + getPath);

http.get({
    host: YUI_API_HOST,
    port: YUI_API_PORT,
    path: getPath
}, function (res) {
    var data = '';

    if (res.statusCode < 200 || res.statusCode > 299) {
        onFetchError(new Error('HTTP ' + res.statusCode));
        return;
    }

    res.on('data', function (chunk) { data += chunk; });
    res.on('error', onFetchError);

    res.on('end', function () {
        try {
            data = JSON.parse(data);
            if (!data.classes.length) {
                onFetchError(new Error('No classes returned for version ' + yuiVersion));
                return;
            }
        } catch (ex) {
            onFetchError(ex);
            return;
        }

        onFetchSuccess(data);
    });
}).on('error', onFetchError);

function onFetchError(err) {
    process.stderr.write('==> Error: ' + err.message + '\n');
    process.exit(1);
}

function onFetchSuccess(data) {
    var syntax = {
        classes  : [],
        constants: [],
        functions: [],
        variables: [],
        version  : yuiVersion
    };

    console.log('Parsing syntax data');

    data.classes.forEach(function (klass) {
        var names = klass.name.split('.');

        names.forEach(function (name) {
            name = name.trim();

            if (name && name.indexOf('~') === -1) {
                syntax.classes.push(name);
            }
        });

        if (klass.methods) {
            util.each(klass.methods, function (method, name) {
                var match = name.match(/\.([^\.]+)$/);

                name = match ? match[1].trim() : name.trim();

                if (!name || method.protected || method.private) {
                    return;
                }

                if (EXCLUDE_FUNCTIONS.indexOf(name) === -1) {
                    syntax.functions.push(name);
                }
            });
        }

        if (klass.properties) {
            util.each(klass.properties, function (prop, name) {
                var match = name.match(/\.([^\.]+)$/);

                name = match ? match[1].trim() : name.trim();

                if (!name || prop.protected || prop.private) {
                    return;
                }

                if (prop.final) {
                    if (EXCLUDE_CONSTANTS.indexOf(name) === -1) {
                        syntax.constants.push(name);
                    }
                } else {
                    if (EXCLUDE_VARIABLES.indexOf(name) === -1) {
                        syntax.variables.push(name);
                    }
                }
            });
        }
    });

    ['classes', 'constants', 'functions', 'variables'].forEach(function (key) {
        var items = util.dedupe(syntax[key]);

        items.sort();

        syntax[key] = items;
        syntax[key + '_joined'] = items.join('|');
    });

    generate(syntax);
}

function generate(syntax) {
    var readStack  = new util.Stack(),
        writeStack = new util.Stack();

    console.log('Generating syntax files');

    TEMPLATES.forEach(function (filename) {
        fs.readFile(filename, 'utf8', readStack.add(function (err, template) {
            if (err) { return filename; }

            return {
                filename: filename,
                template: template
            };
        }));
    });

    readStack.done(function (errors, results) {
        if (errors) {
            errors.forEach(function (err, index) {
                process.stderr.write('==> Error [' + results[index] + ']: ' + err + '\n');
            });

            process.exit(1);
            return;
        }

        results.forEach(function (input) {
            var extname = path.extname(input.filename),
                locals  = util.merge(syntax),
                outname = input.filename.substring(0,
                    input.filename.lastIndexOf(extname)),
                output;

            extname = path.extname(outname);

            if (extname === '.vim') {
                ['classes', 'constants', 'functions', 'variables'].forEach(function (key) {
                    locals[key] = locals[key].map(function (name) {
                        return VIM_ESCAPE.indexOf(name) === -1 ? name : '\\' + name;
                    });
                });
            }

            output = ejs.render(input.template, {locals: locals});

            fs.writeFile(outname, output, 'utf8', writeStack.add(function (err) {
                if (err) { return outname; }

                console.log('==> ' + outname);
            }));
        });

        writeStack.done(function (errors, results) {
            if (errors) {
                errors.forEach(function (err, index) {
                    process.stderr.write('==> Error [' + results[index] + ']: ' + err + '\n');
                });

                process.exit(1);
                return;
            }

            console.log('Done!');
        });
    });
}
