/**
Dedupes an array of strings, returning an array that's guaranteed to contain
only one copy of a given string.

This method differs from `Array.unique()` in that it's optimized for use only
with strings, whereas `unique` may be used with other types (but is slower).
Using `dedupe()` with non-string values may result in unexpected behavior.

@method dedupe
@param {String[]} array Array of strings to dedupe.
@return {Array} Deduped copy of _array_.
@static
**/
function dedupe (array) {
    var hash    = {},
        results = [],
        i, item, len;

    for (i = 0, len = array.length; i < len; ++i) {
        item = array[i];

        if (!hash.hasOwnProperty(item)) {
            hash[item] = 1;
            results.push(item);
        }
    }

    return results;
}
exports.dedupe = dedupe;

/**
Iterates over all items in _obj_ if _obj_ is an array, or over all enumerable
properties if _obj_ is an object, calling the _callback_ for each one.

@method each
@param {Array|Object} obj Array or object to iterate over.
@param {Function} callback
  @param {mixed} callback.value Value of the current array item or property.
  @param {Number|String} callback.key Index (if _obj_ is an array) or key (if
      _obj_ is an object).
@static
**/
function each(obj, callback) {
    if (Array.isArray(obj)) {
        obj.forEach(callback);
    } else {
        Object.keys(obj).forEach(function (key) {
            callback(obj[key], key);
        });
    }
}
exports.each = each;

/**
Returns a new object containing a deep merge of the enumerable properties of all
passed objects. Properties in later arguments take precedence over properties
with the same name in earlier arguments. Object values are deep-cloned. Array
values are _not_ deep-cloned.

@method merge
@param {object} obj* One or more objects to merge.
@return {object} New object with merged values from all other objects.
**/
function merge() {
    var args   = Array.prototype.slice.call(arguments),
        target = {};

    args.unshift(target);
    mix.apply(this, args);

    return target;
}
exports.merge = merge;

/**
Like `merge()`, but augments the first passed object with a deep merge of the
enumerable properties of all other passed objects, rather than returning a
brand new object.

@method mix
@param {object} target Object to receive mixed-in properties.
@param {object} obj* One or more objects to mix into _target_.
@return {object} Reference to the same _target_ object that was passed in.
**/
function mix() {
    var args   = Array.prototype.slice.call(arguments),
        target = args.shift(),
        i, key, keys, len, source, value;

    while ((source = args.shift())) {
        keys = Object.keys(source);

        for (i = 0, len = keys.length; i < len; ++i) {
            key   = keys[i];
            value = source[key];

            if (typeof value === 'object' && !Array.isArray(value)) {
                typeof target[key] === 'object' || (target[key] = {});
                mix(target[key], value);
            } else {
                target[key] = value;
            }
        }
    }

    return target;
}
exports.mix = mix;

/**
Creates a stack for multiple callback management:

    var s = new util.Stack();

    asyncMethod(s.add(fn));
    asyncMethod(s.add(fn));
    asyncMethod(s.add(fn));
    asyncMethod(s.add(fn));

    s.done(function() {
        // Called when all async methods are done.
    });

@class Stack
@return {Stack} Stack instance
@constructor
**/
var Stack = function () {
    this.errors   = [];
    this.finished = 0;
    this.results  = [];
    this.total    = 0;
};

Stack.prototype = {
    add: function (fn) {
        var self  = this,
            index = self.total;

        self.total += 1;

        return function (err) {
            if (err) { self.errors[index] = err; }

            self.finished += 1;
            self.results[index] = fn.apply(null, arguments);
            self.test();
        };
    },

    test: function () {
        if (this.finished >= this.total && this.callback) {
            this.callback.call(null, this.errors.length ? this.errors : null,
                    this.results, this.data);
        }
    },

    done: function (callback, data) {
        this.callback = callback;
        this.data     = data;
        this.test();
    }
};

exports.Stack = Stack;
