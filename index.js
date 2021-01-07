const fs = require('fs')
const xml2js = require('xml2js')
const TurndownService = require('turndown')

async function main() {
  const xml = fs.readFileSync('evernote.nnex')
  const js = await(xml2js.parseStringPromise(xml));
  try {
    const notes = mapNotes(js['nixnote-export'])
    turndownService.use(enMediaPlugin(notes))
    const test = notes.find(note => note.guid === 'f6d96c9b-0c5e-4699-aee7-4796399d8951')
    writeNoteToFile(test)
    saveResourcesAsFiles(test)
  } catch(err) {
    console.log(err)
  }
}

// Convert raw XML data model into easier to use classes
function mapNotes(evernote) {
  const notebooks = evernote['Notebook']
  const notebookNamesByGuid = notebooks
    .map(notebookDom => new Notebook(notebookDom))
    .reduce((map, notebook) => {
      map.set(notebook.guid, notebook)
      return map
    }, new Map())

  const notes = evernote['Note']
  return notes.reduce((arr, noteDom) => {
    const note = new Note(noteDom, notebookNamesByGuid.get(noteDom['NotebookGuid'][0]));
    return [...arr, note]
  }, [])
}

function writeNoteToFile(note) {
  let markdown = turndownService.turndown(note.content)
  markdown = markdown.replace(/\n\s+\n/g, '\n\n') // trim whitespace-only lines
  markdown = markdown.replace(/\n{3,}/g, '\n\n') // never need more than 2 line breaks
  markdown = markdown.replace(/\n\\\*/g, '*') // Asterisks at the beginning of the line were probably intentional
  markdown += '\n'
  for(const [ name, value ] of Object.entries(note.attributes)) {
    markdown += `\n**${name}:** ${value}`
  }
  writeFile(note.notebook.name, `${note.title}.md`, markdown)
}

function writeFile(dir, fileName, data) {
  if(!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  fs.writeFileSync(`${dir}/${fileName}`, data)
}

function saveResourcesAsFiles(note) {
  for(const resource of note.resources) {
    // writeFile(`${note.notebook.name}/assets/`, resource.fileName, resource.data.bytes)
  }
}

// Turndown converts HTML to JSON, and works fine with the XML note content.
const turndownService = new TurndownService({
  // These are just my personal preferences
  bulletListMarker: '-',
  emDelimiter: '*',
})

/*
This creates a Turndown plugin that is aware of all the notes in our file.

Instead of `img` nodes, the note content references images like this:

<en-media ... hash="abc123"></en-media>

Where the hash (abc123 in this case) references note.resource.data.bodyHash
of some resource on the same note.

When we encounter an en-media node, we need to find the resource and build a
markdown image tag with a reference to the file.
*/  
const enMediaPlugin = (notes) => {
  // Proactively map hashes to avoid lookups for every node
  const resourcesByHash = notes
    .map(note => note.resources).flat()
    .filter(resource => resource?.data.bodyHash !== undefined)
    .reduce((map, resource) => {
      map.set(resource.data.bodyHash, resource)
      return map
    }, new Map())
  return (turndown) => {
    turndown.rules.blankRule.replacement = function(content, node) {
      if(node.nodeName === 'EN-MEDIA') {
        const hash = node.attributes.getNamedItem('hash').value
        const resource = resourcesByHash.get(hash)
        const markdown = `[${resource.fileName}](assets/${resource.fileName})`
        return resource.mime.startsWith('image/') ? `!${markdown}` : markdown
      }
    }
  }
}

class Notebook {
  constructor(notebookDom) {
    this.guid = notebookDom['Guid'][0]
    this.name = notebookDom['Name'][0]
  }
}

class Note {
  constructor(noteDom, notebook) {
    this.guid = noteDom['Guid'][0]
    this.title = noteDom['Title'][0]
    this.notebook = notebook
    this.content = noteDom['Content'][0]
    this.attributes = noteDom['Attributes']?.[0]
    this.resources = noteDom['NoteResource']
      ?.map(noteResourceDom => new NoteResource(noteResourceDom))
      ?.reduce((arr, resource) => [...arr, resource], [])
  }
}

class NoteResource {
  constructor(noteResourceDom) {
    this.mime = noteResourceDom?.['Mime']?.[0]
    this.data = new Data(noteResourceDom['Data'][0])
    this.attributes = new ResourceAttributes(noteResourceDom['ResourceAttributes']?.[0])
  }

  get fileName() {
    const hash = this.data.bodyHash
    const fileExtension = this.mime.split('/')[1]
    return this.attributes?.fileName ?? `${hash}.${fileExtension}`
  }
}

class Data {
  constructor(dataDom) {
    this.body = dataDom?.['Body']?.[0]
    this.bodyHash = dataDom?.['BodyHash']?.[0]
  }

  get bytes() {
    if(this.body === undefined) return undefined
    for (var bytes = [], c = 0; c < this.body.length; c += 2) {
      bytes.push(parseInt(this.body.substr(c, 2), 16));
    }
    return bytes;
  }
}

class ResourceAttributes {
  constructor(resourceAttributesDom) {
    this.timestamp = resourceAttributesDom?.['Timestamp']?.[0]
    this.fileName = resourceAttributesDom?.['FileName']?.[0]
  }
}

main()
