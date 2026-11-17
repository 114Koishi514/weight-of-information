'use strict';
(() => {
  let connection;
  function open(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{
      const request=indexedDB.open('pts2000-local-registry',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('records',{keyPath:'serial',autoIncrement:true});
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{db.close();connection=null;};
        resolve(db);
      };
    }).catch(error=>{connection=null;throw error;});
    return connection;
  }
  // Only report success once IndexedDB has committed the transaction.
  async function transaction(mode,operation){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('records',mode);
      const request=operation(tx.objectStore('records'));
      tx.oncomplete=()=>resolve(request.result);
      tx.onabort=()=>reject(tx.error||new Error('Archive transaction did not commit.'));
    });
  }
  const list=()=>transaction('readonly',store=>store.getAll());
  const add=record=>transaction('readwrite',store=>store.add(record));
  function setDisposition(serial,disposition){
    return transaction('readwrite',store=>{
      const request=store.get(serial);
      request.onsuccess=()=>{
        const row=request.result;
        if(!row){store.transaction.abort();return;}
        row.disposition=disposition;store.put(row);
      };
      return request;
    });
  }
  PTS.archive={list,add,setDisposition};
})();
