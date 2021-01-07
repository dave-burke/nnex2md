# nnex2md

This script converts `.nnex` files (exported from [NixNote](https://github.com/baumgarr/Nixnote2), formerly Nevernote) to Markdown.

## Usage

```
node index.js [mynotes.nnex]
```

## Behavior

Files are written to the directory you run the script from. It creates one
subdirectory per notebook. Each notebook directory has an 'assets' directory
where file resources are saved. Files with no name are named after their hash.

Like this:

```
Notebook
|-- assets
|   `-- image.jpg
`-- note.md
```

