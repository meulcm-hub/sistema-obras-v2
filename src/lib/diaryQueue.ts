export type DailyPayload = {
  data: string; clima_manha: string; clima_tarde: string; produtivo: boolean
  pedreiros: number; serventes: number; carpinteiros: number; armadores: number
  bombeiros: number; eletricistas: number; terceiros: number; equipamentos: string; ocorrencias: string
}
export type PendingDaily = { operation: string; id: string; revision: string|null; userId: string; obraId: string; payload: DailyPayload; services: string[]; createdAt: number; error?: string }
const dbName = 'lcm-obras-offline-v1'
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(dbName,1)
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('diario'))request.result.createObjectStore('diario',{keyPath:'operation'})}
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error)
  })
}
async function transact<T>(mode: IDBTransactionMode, run:(store:IDBObjectStore)=>IDBRequest<T>): Promise<T> {
  const db=await openDB()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('diario',mode)
    const request=run(tx.objectStore('diario'))
    tx.oncomplete=()=>{db.close();resolve(request.result)}
    tx.onerror=()=>{db.close();reject(tx.error||request.error)}
    tx.onabort=()=>{db.close();reject(tx.error||request.error)}
  })
}
export async function listPending(userId:string,obraId:string):Promise<PendingDaily[]> {
  const all=await transact('readonly',s=>s.getAll()) as PendingDaily[]
  return all.filter(x=>x.userId===userId&&x.obraId===obraId).sort((a,b)=>a.createdAt-b.createdAt)
}
export function enqueue(item:PendingDaily){return transact('readwrite',s=>s.put(item))}
export function removePending(operation:string){return transact('readwrite',s=>s.delete(operation))}
