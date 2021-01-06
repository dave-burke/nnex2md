const fs = require('fs')
const xml2js = require('xml2js')
const TurndownService = require('turndown')

const turndownService = new TurndownService({
  bulletListMarker: '-',
  emDelimiter: '*',
})

turndownService.addRule('em-media', {
  filter: ['en-media'],
  replacement(content) {
    return '' // TODO
  }
})

async function main() {
  const xml = fs.readFileSync('evernote.nnex')
  const js = await(xml2js.parseStringPromise(xml));
  try {
    const notes = mapNotes(js['nixnote-export'])
    const test = notes.find(note => note.content.length > 300 && note?.resources?.[0].data?.body !== undefined)
    writeNoteToFile(test)
    saveResources(test)
  } catch(err) {
    console.log(err)
  }
}

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
  console.log(`${note.notebook.name} / ${note.title}`)
  let markdown = turndownService.turndown(note.content)
  markdown = markdown.replace(/\n\s+\n/g, '\n\n') // trim whitespace-only lines
  markdown = markdown.replace(/\n{3,}/g, '\n\n') // never need more than 2 line breaks
  markdown = markdown.replace(/\n\\\*/g, '*') // Asterisks at the beginning of the line were probably intentional
  markdown += '\n'
  for(const [ name, value ] of Object.entries(note.attributes)) {
    markdown += `\n**${name}:** ${value}`
  }
  console.log(markdown)
}

function saveResources(note) {
  for(const resource of note.resources) {
    const mimeType = resource.mime
    const bytes = resource?.data?.bytes
    const fileName = resource?.attributes?.fileName
    if(fileName !== undefined) {
      console.log(`Save ${mimeType} as ${fileName}`)
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
