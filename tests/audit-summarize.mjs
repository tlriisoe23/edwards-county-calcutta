// Read-only audit report aggregation. Does not modify either auction database.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='docs/audit-evidence';
const read=name=>JSON.parse(fs.readFileSync(`${dir}/${name}.json`));
const api=read('api'),math=read('math');
const percentile=(values,p)=>{const v=[...values].sort((a,b)=>a-b);return v[Math.max(0,Math.ceil(v.length*p)-1)];};
const stats=rows=>({samples:rows.length,minMs:Math.min(...rows.map(r=>r.ms)),p50Ms:percentile(rows.map(r=>r.ms),.5),p95Ms:percentile(rows.map(r=>r.ms),.95),maxMs:Math.max(...rows.map(r=>r.ms)),maxBytes:Math.max(0,...rows.map(r=>r.bytes||0))});
const summary={at:new Date().toISOString(),sourceCommit:'dfab14906c04b5a6d99ffffbfba4249883750eae',suites:{acceptance:read('acceptance'),refinement:read('refinement'),math:{cases:math.cases,passed:math.passed,failed:math.failed,seed:math.seed,assertions:math.assertions},csv:{passed:math.observations.filter(r=>r.status==='PASS').length,failed:math.observations.filter(r=>r.status==='FAIL').length},api:{passed:api.checks.filter(r=>r.status==='PASS').length,failed:api.checks.filter(r=>r.status==='FAIL').length},balance:read('balance')},timings:{scope:'Local dev HTTP observations, mixed setup and 100-team fixture; not hosted latency or load testing.',all:stats(api.timings),adminReads:stats(api.timings.filter(r=>r.action==='admin-read')),bids:stats(api.timings.filter(r=>r.action==='bid'&&r.status===200)),sales:stats(api.timings.filter(r=>r.action==='sell')),exports:api.timings.filter(r=>r.action.startsWith('export-')),public:api.timings.filter(r=>r.action==='large-public')},artifacts:[]};
summary.suites.workflows=read('workflows');
summary.scriptedChecks={passed:summary.suites.acceptance.checks+summary.suites.refinement.checks+math.passed+summary.suites.csv.passed+summary.suites.api.passed+summary.suites.workflows.passed,failed:math.failed+summary.suites.csv.failed+summary.suites.api.failed+summary.suites.workflows.failed+(summary.suites.balance.status==='FAIL'?1:0)};
for(const path of [...fs.readdirSync(dir).filter(n=>n.startsWith('sample-')).map(n=>`${dir}/${n}`),'.sites-runtime/audit-exports/sample-backup.json']){
 const data=fs.readFileSync(path);summary.artifacts.push({path,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}
const baseline=JSON.parse(fs.readFileSync('.sites-runtime/audit-review-baseline.json'));
const base='http://localhost:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=%2Fadmin',{redirect:'manual'}),cookie=login.headers.get('set-cookie').split(';')[0];
const response=await fetch(base+'/api/admin?event='+encodeURIComponent(baseline.data.event.id),{headers:{cookie}});
assert.equal(response.status,200);const current=await response.json();
let unchanged=true;try{assert.deepEqual(current.data,baseline.data);}catch{unchanged=false;}
summary.reviewPreservation={status:unchanged?'PASS':'CHANGED',eventId:baseline.data.event.id,beforeRevision:baseline.data.event.revision,afterRevision:current.data.event.revision,fullEventDataIdentical:unchanged,note:'Read-only comparison. If the user changed their review while auditing, retain their work; never restore an older snapshot.'};
fs.writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
