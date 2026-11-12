const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const paths=['/private/tmp/guru-legal-delivery-before-app.js','/Users/vl/Developer/guru-platform/app.js'];
const models=paths.map(p=>{const s=fs.readFileSync(p,'utf8'),ctx=vm.createContext({isMegaMarketingCard:c=>c.id==='card-7'});const part=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b));vm.runInContext(part('const MEGA_PLATFORM_LEGAL_KEYS','const MEGA_PLATFORM_OLD_FIXED_KEYS')+part('const MEGA_PLATFORM_LEGAL_QUESTIONS','const MEGA_PLATFORM_LEGAL_HELP')+part('function megaPlatformLegalRequirement','function megaPlatformLegalSummary'),ctx);return w=>{ctx.w=w;return JSON.parse(JSON.stringify(vm.runInContext('deriveLegalPages(w)',ctx)))}});
const src=JSON.parse(fs.readFileSync('/private/tmp/guru-now-korich-workspace.json','utf8')),w=src.workspace||src;
const original=w.gates.find(g=>g.id==='gate-0').cards.find(c=>c.id==='card-7').megaMarketing.platformV2;
const results=[];
for(const personal of [undefined,true,false])for(const order of [undefined,true,false]){
 const platform={...original};if(personal!==undefined)platform.collectsPersonalDataV1=personal;if(order!==undefined)platform.siteCheckoutV1=order;
 const state={gates:[{id:'gate-0',cards:[{id:'card-7',megaMarketing:{platformV2:platform}}]}]},before=JSON.stringify(state);
 const pair=models.map(f=>f(state));assert.equal(JSON.stringify(state),before);
 const simplify=m=>({total:m.total,done:m.done,ready:m.ready,questions:m.questions,checks:m.checks.sort((a,b)=>a.target.label.localeCompare(b.target.label))});
 assert.deepEqual(simplify(pair[0]),simplify(pair[1]));results.push({personal:personal??'unchanged',order:order??'unchanged',total:pair[1].total,done:pair[1].done,ready:pair[1].ready,unchanged:true});
}
fs.writeFileSync('/Users/vl/Developer/guru-platform/artifacts/legal-delivery-audit/model-comparison.json',JSON.stringify(results,null,2));console.log('Before/after legal model: PASS (9 combinations)');
