import '../server/config.js';
import { mkdirSync,writeFileSync } from 'node:fs';
import { Store } from '../server/store.js';
import { profiles } from '../server/seeds.js';
import { demoState } from '../server/workspace.js';
import { assess } from '../server/assessment.js';
import { sampleCsv } from '../server/imports.js';
mkdirSync('.data',{recursive:true});mkdirSync('samples',{recursive:true});
const db=new Store('.data/folio.sqlite',process.env.DATABASE_URL || undefined);await db.init();let added=0;
try{for(const p of profiles){writeFileSync(`samples/${p.id}.csv`,sampleCsv(p.id));const owner=`seed:${p.id}`;
 if(!await db.get(owner) && !await db.isDeleted(owner)){const state=demoState(p.id);state.connected=true;state.assessment=assess(state.borrower,1);await db.create(owner,state);await db.mutate(owner,()=>{});added++;}
}console.log(`Five deterministic synthetic CSVs generated; ${added} missing seed workspaces inserted. Existing workspaces preserved. Public demos always get separate session-scoped copies.`);}finally{await db.close()}
