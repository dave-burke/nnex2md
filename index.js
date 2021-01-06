const fs = require('fs')
const xml2js = require('xml2js')

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
    this.attributes = new NoteAttributes(noteDom['Attributes']?.[0])
    this.resources = noteDom['NoteResource']
      ?.map(noteResourceDom => new NoteResource(noteResourceDom))
      ?.reduce((arr, resource) => [...arr, resource], [])
  }
}

class NoteAttributes {
  constructor(noteAttributesDom) {
    this.Author = noteAttributesDom?.['Author']?.[0]
    this.Source = noteAttributesDom?.['Source']?.[0]
    this.Latitude = noteAttributesDom?.['Latitude']?.[0]
    this.Longitude = noteAttributesDom?.['Longitude']?.[0]
    this.Altitude = noteAttributesDom?.['Altitude']?.[0]
    this.SubjectDate = noteAttributesDom?.['SubjectDate']?.[0]
    this.SourceApplication = noteAttributesDom?.['SourceApplication']?.[0]
    this.SourceUrl = noteAttributesDom?.['SourceUrl']?.[0]
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
}

async function main() {
  const xml = fs.readFileSync('evernote.nnex')
  const js = await(xml2js.parseStringPromise(xml));
  try {
    const notes = mapNotes(js['nixnote-export'])
    const test = notes.find(note => note.content.length > 300 && note?.resources?.[0].data?.body !== undefined)
    writeNoteToFile(test)
  } catch(err) {
    console.log(err)
  }
}

main()
