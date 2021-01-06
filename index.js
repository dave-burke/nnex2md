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
    this.attributes = new NoteAttributes(noteDom['NoteAttributes']?.[0])
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

async function main() {
  const xml = fs.readFileSync('evernote.nnex')
  const js = await(xml2js.parseStringPromise(xml));
  try {
    const notes = mapNotes(js['nixnote-export'])
    for(note of notes) {
      console.log(`${note.notebook.name} / ${note.title}`)
    }
  } catch(err) {
    console.log(err)
  }
}

/* TODO
Note / NoteResource
- Guid
- Mime (image/jpeg)
- Data
  - Body (encoded as hex?)
  - BodyHash (referenced by en-media hash in content)
- ResourceAttributes
  - Timestamp (optional)
  - FileName (example.jpg -- sometimes missing!)
*/
main()
