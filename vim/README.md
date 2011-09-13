Vim Syntax for YUI 3
====================

This is a simple Vim syntax for YUI 3 that's meant to augment [Yi Zhao's
javascript.vim syntax](http://www.vim.org/scripts/script.php?script_id=1491).

Installation
------------

1. Copy `after/syntax/javascript.vim` to your `~/.vim/after/syntax/` directory
   (create the directory if it doesn't exist).

2. If you aren't already using Yi Zhao's javascript.vim syntax,
   [download it](http://www.vim.org/scripts/script.php?script_id=1491) and copy
   it to your `~/.vim/syntax/` directory.

Contributing
------------

The YUI 3 syntax is generated automatically by the `build.js` script from the
latest syntax data retrieved from the YUI website API. To modify the syntax,
edit the `after/syntax/javascript.vim.ejs` template; don't edit the generated
syntax file itself.

I know little about vim syntaxes, so this thing can probably be improved.
Patches and feedback are very welcome.
