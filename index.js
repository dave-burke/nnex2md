const fs = require('fs')
const xml2js = require('xml2js')

function mapNotes(evernote) {
  const notebooks = evernote['Notebook']
  const notebookNamesByGuid = notebooks.reduce((map, notebook) => {
    map.set(notebook['Guid'], notebook['Name'])
    return map
  }, new Map())

  const notes = evernote['Note']
  const notesByNotebookName = notes.reduce((map, note) => {
    const notebookGuid = note['NotebookGuid']
    const notebookName = notebookNamesByGuid.get(notebookGuid)
    console.log(`'${notebookGuid}' -> ${notebookName} (${notebookNamesByGuid.has(notebookGuid)})`)
    const noteTitle = note['Title']
    map.set(noteTitle, notebookName)
    return map
  }, new Map())
  console.log(notebookNamesByGuid)
  return notesByNotebookName
}

async function main() {
  const xml = fs.readFileSync('evernote.nnex')
  const js = await(xml2js.parseStringPromise(xml));
  return mapNotes(js['nixnote-export'])
}

main()//.then(console.log)
